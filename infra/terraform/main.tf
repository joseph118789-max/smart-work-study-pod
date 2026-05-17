# Terraform Configuration for SWP - AWS

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Backend (S3 with DynamoDB for state lock)
backend "s3" {
  bucket = "swp-terraform-state"
  key    = "prod/terraform.tfstate"
  region = "ap-southeast-1"
  
  dynamodb_table = "swp-terraform-locks"
}

provider "aws" {
  region = "ap-southeast-1"  # Singapore/Malaysia region
}

# VPC Configuration
resource "aws_vpc" "swp_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name        = "swp-vpc"
    Environment = "prod"
  }
}

# Subnets
resource "aws_subnet" "swp_subnet_a" {
  vpc_id                  = aws_vpc.swp_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone        = "ap-southeast-1a"
  map_public_ip_on_launch = true
  
  tags = { Name = "swp-subnet-a" }
}

resource "aws_subnet" "swp_subnet_b" {
  vpc_id                  = aws_vpc.swp_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone        = "ap-southeast-1b"
  map_public_ip_on_launch = true
  
  tags = { Name = "swp-subnet-b" }
}

# Internet Gateway
resource "aws_internet_gateway" "swp_igw" {
  vpc_id = aws_vpc.swp_vpc.id
  tags   = { Name = "swp-igw" }
}

# Route Table
resource "aws_route_table" "swp_rt" {
  vpc_id = aws_vpc.swp_vpc.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.swp_igw.id
  }
  
  tags = { Name = "swp-route-table" }
}

resource "aws_route_table_association" "swp_rta_a" {
  subnet_id      = aws_subnet.swp_subnet_a.id
  route_table_id = aws_route_table.swp_rt.id
}

resource "aws_route_table_association" "swp_rta_b" {
  subnet_id      = aws_subnet.swp_subnet_b.id
  route_table_id = aws_route_table.swp_rt.id
}

# RDS PostgreSQL
resource "aws_db_instance" "swp_postgres" {
  identifier           = "swp-postgres"
  engine               = "postgres"
  engine_version       = "16.1"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  max_allocated_storage = 100
  
  db_name  = "swp_db"
  username = "swp_admin"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.swp_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.swp_db_subnet.name
  
  backup_retention_period = 7
  skip_final_snapshot     = true
  
  tags = { Name = "swp-postgres" }
}

resource "aws_db_subnet_group" "swp_db_subnet" {
  name       = "swp-db-subnet"
  subnet_ids = [aws_subnet.swp_subnet_a.id, aws_subnet.swp_subnet_b.id]
  
  tags = { Name = "swp-db-subnet" }
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "swp_redis" {
  cluster_id           = "swp-redis"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  
  port                 = 6379
  security_group_ids   = [aws_security_group.swp_sg.id]
  subnet_group_name   = aws_elasticache_subnet_group.swp_redis_subnet.name
  
  tags = { Name = "swp-redis" }
}

resource "aws_elasticache_subnet_group" "swp_redis_subnet" {
  name       = "swp-redis-subnet"
  subnet_ids = [aws_subnet.swp_subnet_a.id, aws_subnet.swp_subnet_b.id]
}

# Security Group
resource "aws_security_group" "swp_sg" {
  name        = "swp-security-group"
  vpc_id      = aws_vpc.swp_vpc.id
  
  ingress {
    from_port   = 443
    to_port     = 443
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }
  
  ingress {
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = { Name = "swp-sg" }
}

# EKS Cluster
resource "aws_eks_cluster" "swp_eks" {
  name     = "swp-cluster"
  role_arn = aws_iam_role.eks_cluster_role.arn
  version  = "1.28"
  
  vpc_config {
    subnet_ids              = [aws_subnet.swp_subnet_a.id, aws_subnet.swp_subnet_b.id]
    security_group_ids     = [aws_security_group.swp_sg.id]
    endpoint_public_access  = true
  }
  
  depends_on = [
    aws_iam_role_policy_attachment.cluster_policy
  ]
}

# EKS Node Group
resource "aws_eks_node_group" "swp_nodes" {
  cluster_name    = aws_eks_cluster.swp_eks.name
  node_group_name = "swp-workers"
  node_role_arn   = aws_iam_role.eks_worker_role.arn
  subnet_ids      = [aws_subnet.swp_subnet_a.id, aws_subnet.swp_subnet_b.id]
  
  scaling_config {
    desired_size = 2
    max_size     = 4
    min_size     = 1
  }
  
  instance_types = ["t3.medium"]
  
  depends_on = [
    aws_iam_role_policy_attachment.worker_node_policy,
    aws_iam_role_policy_attachment.eks_workload_policy
  ]
}

# IAM Roles
resource "aws_iam_role" "eks_cluster_role" {
  name = "swp-eks-cluster-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

resource "aws_iam_role" "eks_worker_role" {
  name = "swp-eks-worker-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_worker_role.name
}

resource "aws_iam_role_policy_attachment" "eks_workload_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_worker_role.name
}

# Variables
variable "db_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
}