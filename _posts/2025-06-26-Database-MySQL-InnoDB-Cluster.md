---
title: "Install MySQL InnoDB Cluster"
categories: ["Categories","Database", "MySQL", "Install"]
taxonomy: MySQL_Install
date: 2025-06-26
---

# 서버 구성

서버는 총 4대임. OS: CentOS7, Disk:50GB, Mem: 8GB

- ic-server1(192.168.56.13)
- ic-server2(192.168.56.14)
- ic-server3(192.168.56.15)
- ic-router1(192.168.56.16)

---

## 1. MySQL 서버 설치

아래 블로그 참고

[MySQL 설치 블로그](https://blog.naver.com/ricky63/223515480011)

(router 서버 제외하고 다 설치)

---

## 2. Cluster 구축

### 2-1. 호스트 수정

※ 이 과정을 수행하지 않으면, 클러스터 인스턴스 추가 단계에서 추가가 안된다. ( 모든 서버 공통 )

```bash
[root@ic-server1 ~]# vi /etc/hosts
```

#### hosts 파일 예시
```
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.56.13 ic-server1
192.168.56.14 ic-server2
192.168.56.15 ic-server3
192.168.56.16 ic-router1
```

```bash
[root@ic-server1 ~]# vi /etc/hostname
# 각 서버 호스트 네임에 맞게 설정
ic-server1
```

---

### 2-2. Pre-Checking

서버 인스턴스에서 프로덕션 배포를 생성하기 전에 각 인스턴스의 MySQL이 올바르게 구성되었는지 확인해야 한다.

dba.configureInstance() 기능은 인스턴스 구성의 일부로 이 작업을 수행하지만 선택적으로 기능을 사용할 수 있다.

Pre-Checking은 실제 인스턴스의 구성을 변경하지는 않으며 인스턴스가 InnoDB가 클러스터 구성 요구사항에 나열된 요구 사항에 충족하는지를 확인한다.

MySQL Shell은 로컬에서도 접속되고 Remote 로도 접속되기 때문에 모든 서버에 설치한다.

```bash
[root@ic-server1 ~]# sudo yum install -y https://dev.mysql.com/get/mysql80-community-release-el7-3.noarch.rpm
[root@ic-server1 ~]# rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2023
[root@ic-server1 ~]# sudo yum install -y mysql-shell
```

MySQL 설치된 서버 (Master, Slave)들만 유저 생성 명령어 입력한다.

```sql
mysql> create user root@'%' identified by 'qkqkaqk';
mysql> grant all privileges on *.* to root@'%' with grant option;
mysql> flush privileges;
```

※ root@'%' 계정을 생성하지 않으면, dba.checkInstanceConfiguration('root@localhost:3306') 명령어 실행할 때 아래와 같은 에러가 발생한다.

```
ERROR: New account(s) with proper source address specification to allow remote connection from all instances must be created to manage the cluster.
Dba.checkInstanceConfiguration: User 'root' can only connect from 'localhost'. (RuntimeError)
```

MySQL 설치된 서버 (Master, Slave)만 dba.checkInstanceConfiguration 실행해주기

```bash
[root@ic-server1 ~]# mysqlsh
MySQL  JS > dba.checkInstanceConfiguration('root@localhost:3306')
```

실행 예시 및 결과, 에러 무시 가능 설명 등 상세 내용 포함

---

### 2-3. Configuring Instances for Cluster

클러스터 구성 하기 전에 사전에 필요한 요구사항에 대해서 체크 + 설정변경을 할 수 있는 dba.configureInstance 명령어를 진행하는 단계이다.

MySQL 설치된 서버 (Master, Slave)만 진행한다.

#### my.cnf 설정 (서버 다)

```
server-id= # 서버별로 다른 값
port=3306
bind-address=0.0.0.0
mysqlx=ON
mysqlx-port=33060
mysqlx-bind-address=0.0.0.0
```

```bash
[root@ic-server1 ~]# systemctl restart mysqld
[root@ic-server1 ~]# mysqlsh
MySQL  JS > dba.configureInstance('root@localhost:3306')
```

설정 변경, 재시작, 변수 설명 등 상세 내용 포함

---

### 2-4. 클러스터 접속 계정 생성

MySQL 설치된 서버 (Master, Slave)만 진행한다.

```sql
create user clusteradm@'%' identified by 'clusteradm';
grant all privileges on *.* to clusteradm@'%' with grant option;
flush privileges;
```

---

### 2-5. 클러스터 생성

ic-server1에서 클러스터 생성

```bash
MySQL  JS > \connect clusteradm@ic-server1:3306
MySQL  JS > var cluster = dba.createCluster('HmCluster')
```

---

### 2-6. 클러스터에 멤버 추가

ic-server1에서 ic-server2, ic-server3을 추가

```bash
MySQL  JS > var cluster = dba.getCluster()
MySQL  JS > cluster.addInstance('clusteradm@ic-server2:3306')
MySQL  JS > cluster.addInstance('clusteradm@ic-server3:3306')
```

GTID, Clone, 방화벽 등 상세 설명 포함

---

### 2-7. 클러스터 상태 확인

```bash
MySQL  JS > var cluster = dba.getCluster()
MySQL  JS > cluster.status()
```

상태 예시, topology, Single-Primary 등 상세 설명 포함

---

## 3. MySQL Router 구성

### 3-1. 사전 필요 패키지 설치

ic-router1에서 진행

```bash
yum -y install ncurses ncurses-devel ncurses-libs openssl openssl-devel glibc jq bison make cmake readline gcc gcc-c++ wget autoconf automake libtool* libmcrypt* git telnet patchelf libtirpc* rpcgen numactl numactl-devel ncurses-compat-libs libaio libaio-devel rsyslog
```

### 3-2. 그룹 및 유저 생성

```bash
groupadd mysql
useradd -M -s /sbin/nologin -g mysql mysql
```

### 3-3. ulimit, 커널 파라미터 설정

limits.conf, sysctl.conf 설정 및 적용

### 3-4. MySQL Router 설치

```bash
wget https://downloads.mysql.com/archives/get/p/41/file/mysql-router-8.0.23-linux-glibc2.12-x86_64.tar.xz
tar xvf mysql-router-8.0.23-linux-glibc2.12-x86_64.tar.xz -C /usr/local
cd /usr/local
chown -R mysql:mysql mysql-router-8.0.23-linux-glibc2.12-x86_64
mv mysql-router-8.0.23-linux-glibc2.12-x86_64 mysql-router
echo "export PATH=\$PATH:/usr/local/mysql-router/bin" >> ~/.bash_profile
source ~/.bash_profile
```

### 3-5. MySQL Router 설정 및 부트스트랩

```bash
mysqlrouter --bootstrap clusteradm@ic-server1:3306 --name ic-router1 --directory /usr/local/mysql-router/myrouter --account myrouter --user mysql
```

설정 과정, 계정 생성, 에러 및 해결법 등 상세 설명 포함

### 3-6. MySQL Router 정보 확인

conf 파일, state.json, metadata_cache, routing 등 상세 설명

### 3-7. 라우터 DB 계정 정보

계정 생성, 권한 확인 쿼리 등 상세 설명

### 3-8. Cluster 내 Router 정보

AdminAPI, metadata 테이블 등에서 확인하는 방법

### 3-9. MySQL Router 시작 및 접속

```bash
cd /usr/local/mysql-router/myrouter
sudo ./start.sh
ps -ef| grep mysql-router
sudo netstat -antp | grep mysqlrouter
```

방화벽, 포트, 로그 확인 등 상세 설명

---

## 참고 블로그

- [MySQL 설치 블로그](https://blog.naver.com/ricky63/223515480011)
- [InnoDB Cluster 세부 기능 블로그](https://blog.naver.com/ricky63/223517162186) 