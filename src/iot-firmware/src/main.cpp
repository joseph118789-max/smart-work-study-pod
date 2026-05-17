/**
 * SWP IoT Edge Controller Firmware
 * ESP32-based smart lock controller with MQTT
 */

#include <Arduino.h>
#include <WiFi.h>
#include <MQTT.h>
#include <ArduinoJson.h>
#include <WiFiManager.h>

// Configuration
const char* mqttDeviceTopic = "pod/+/unlock";  // Subscribe to all pod unlock commands
const char* mqttStatusTopic = "pod/+/status";  // Publish device status
const char* mqttHeartbeatTopic = "pod/+/heartbeat";

// GPIO Pins
#define LOCK_RELAY_PIN 4
#define STATUS_LED_PIN 5
#define DOOR_SENSOR_PIN 2

// Device Configuration
String deviceId;
String podId;
bool isLocked = true;

// MQTT Callbacks
WiFiClient net;
MQTTClient client;

unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000;  // 30 seconds

void handleUnlockCommand(String& podId, JsonObject& payload) {
  // Verify command is for this pod
  if (payload["bookingId"].isNull()) {
    Serial.println("Invalid unlock command - no bookingId");
    return;
  }
  
  digitalWrite(LOCK_RELAY_PIN, HIGH);  // Energize relay to unlock
  delay(500);                           // 500ms pulse
  digitalWrite(LOCK_RELAY_PIN, LOW);
  
  isLocked = false;
  
  // Log unlock event
  client.publish(mqttStatusTopic, "unlocked");
  
  Serial.println("Unlock command executed for booking: " + payload["bookingId"].as<String>());
}

void handleLockCommand(String& podId, JsonObject& payload) {
  digitalWrite(LOCK_RELAY_PIN, LOW);  // De-energize to lock
  isLocked = true;
  
  client.publish(mqttStatusTopic, "locked");
  Serial.println("Lock command executed");
}

void messageReceived(String& topic, String& payload) {
  Serial.println("MQTT message received on topic: " + topic);
  
  // Parse topic to extract pod ID
  // Expected format: pod/{podId}/unlock or pod/{podId}/lock
  int slashIndex = topic.indexOf('/', 4);
  String msgPodId = topic.substring(4, slashIndex);
  
  if (msgPodId != podId) {
    Serial.println("Message not for this pod, ignoring");
    return;
  }
  
  // Parse payload
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload);
  
  if (error) {
    Serial.println("Failed to parse JSON: " + String(error.c_str()));
    return;
  }
  
  JsonObject obj = doc.as<JsonObject>();
  
  if (topic.endsWith("/unlock")) {
    handleUnlockCommand(msgPodId, obj);
  } else if (topic.endsWith("/lock")) {
    handleLockCommand(msgPodId, obj);
  }
}

void sendHeartbeat() {
  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId;
  doc["podId"] = podId;
  doc["status"] = isLocked ? "locked" : "unlocked";
  doc["uptime"] = millis();
  doc["rssi"] = WiFi.RSSI();
  doc["freeHeap"] = ESP.getFreeHeap();
  
  String payload;
  serializeJson(doc, payload);
  
  String topic = String(mqttHeartbeatTopic).substring(0, 8) + podId + "/heartbeat";
  client.publish(topic, payload);
  
  Serial.println("Heartbeat sent");
}

void setup() {
  Serial.begin(115200);
  
  // Initialize GPIO
  pinMode(LOCK_RELAY_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  pinMode(DOOR_SENSOR_PIN, INPUT_PULLUP);
  
  digitalWrite(LOCK_RELAY_PIN, LOW);  // Start locked
  digitalWrite(STATUS_LED_PIN, LOW);
  
  // Generate device ID from MAC address
  deviceId = WiFi.macAddress();
  podId = "POD-" + deviceId.substring(12).c_str();  // Use last 6 chars of MAC
  
  Serial.println("SWP IoT Controller Starting...");
  Serial.println("Device ID: " + deviceId);
  Serial.println("Pod ID: " + podId);
  
  // WiFi Manager - auto-connects and stores credentials
  WiFiManager wm;
  if (!wm.autoConnect("SWP-Setup")) {
    Serial.println("Failed to connect, resetting...");
    ESP.restart();
  }
  
  Serial.println("WiFi connected: " + WiFi.SSID());
  Serial.println("IP: " + WiFi.localIP().toString());
  
  // Configure MQTT topic with actual pod ID
  String subscribeTopic = "pod/" + podId + "/unlock";
  String subscribeTopicLock = "pod/" + podId + "/lock";
  String statusTopic = "pod/" + podId + "/status";
  String heartbeatTopic = "pod/" + podId + "/heartbeat";
  
  client.begin("broker.emqx.io:1883", net);  // Demo broker
  client.onMessage(messageReceived);
  
  Serial.println("Connecting to MQTT broker...");
  
  while (!client.connect(podId.c_str())) {
    Serial.print(".");
    delay(1000);
  }
  
  Serial.println("\nMQTT connected!");
  
  client.subscribe(subscribeTopic);
  client.subscribe(subscribeTopicLock);
  
  Serial.println("Subscribed to topics: " + subscribeTopic + ", " + subscribeTopicLock);
  
  // Send startup heartbeat
  sendHeartbeat();
}

void loop() {
  client.loop();
  
  // Check door sensor
  int doorState = digitalRead(DOOR_SENSOR_PIN);
  if (doorState == HIGH && !isLocked) {
    // Door opened while unlocked - log it
    Serial.println("Door opened while unlocked");
  }
  
  // Send heartbeat periodically
  if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
  
  // LED heartbeat
  digitalWrite(STATUS_LED_PIN, (millis() / 1000) % 2);
  
  delay(10);
}