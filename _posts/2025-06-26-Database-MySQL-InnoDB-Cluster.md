---
title: "Install MySQL InnoDB Cluster"
categories: ["Categories","Database", "MySQL", "Install"]
taxonomy: MySQL_Install
date: 2025-06-26
---

> **MySQL InnoDB Cluster는 MySQL의 고가용성(HA) 및 확장성을 위한 공식 솔루션으로, Group Replication과 MySQL Router를 활용해 장애 자동 복구, 확장, 운영 자동화를 제공합니다. 본 포스트는 실전 구축, 설정, 장애/복구, 라우터 다중화 등 모든 주요 작업을 실제 예시와 함께 상세하게 정리합니다.**

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

#### hosts 파일에 아래와 같이 기입
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

dba.configureInstance를 통해서 수동으로 직접 설정 변경 등을 해야 하는 부분에 대해서 MySQL Shell이 편리하게 설정을 진행해준다.

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

group replication 내에서 사용할 계정을 생성한다.

MySQL 설치된 서버 (Master, Slave)만 진행한다.

```sql
create user clusteradm@'%' identified by 'clusteradm';
grant all privileges on *.* to clusteradm@'%' with grant option;
flush privileges;
```

---

### 2-5. 클러스터 생성

2번 Pre-Checking에서 dba.configureInstance()가 success가 나왔다면, dba.createCluster() AdminAPI를 사용하여 클러스터를 생성한다.

MySQL Shell이 연결된 인스턴스를 클러스터의 시드 인스턴스로 사용한다.

시드 인스턴스는 클러스터에 추가하는 다른 인스턴스에 복제되어 시드 인스턴스의 복제본이 된다.

이번 테스트에서는 ic-server1 인스턴스를 시드로 사용할 것이다. (ic-server1에서 클러스터를 생성하면, 나머지 두 서버가 ic-server1 클러스터 그룹으로 들어오게 된다.) ic-server1 에서 작업.

실제로 그룹 복제를 수동으로 한다면, 훨씬 복잡하고 어려운 구성을 직접 진행해야 하지만, dba.createCluster() 명령어를 통해서 자동으로 처리를 해주게 된 것이다.

InnoDB Cluster 기본 구성은 Single-Primary 모드이다. Multi-Primary 모드를 하려면 옵션을 추가해줘야 한다.

ex) var cluster = dba.createCluster('HmCluster',{multiPrimary:true})

# 하기 전 SELINUX DISABLED 인지 확인하고 시작

# ic-server1 서버에서만 작업

```bash
[root@ic-server1 ~]# mysqlsh
MySQL Shell 8.0.35

Copyright (c) 2016, 2023, Oracle and/or its affiliates.
Oracle is a registered trademark of Oracle Corporation and/or its affiliates.
Other names may be trademarks of their respective owners.

Type '\help' or '\?' for help; '\quit' to exit.

MySQL  JS > \connect clusteradm@ic-server1:3306
Creating a session to 'clusteradm@ic-server1:3306'
Please provide the password for 'clusteradm@ic-server1:3306': **********
Save password for 'clusteradm@ic-server1:3306'? [Y]es/[N]o/Ne[v]er (default No): n
Fetching schema names for auto-completion... Press ^C to stop.
Your MySQL connection id is 182
Server version: 8.0.35 MySQL Community Server - GPL
No default schema selected; type \use <schema> to set one.
ic-server1:3306 ssl  JS > var cluster = dba.createCluster('HmCluster')
```

A new InnoDB Cluster will be created on instance 'ic-server1:3306'.

Validating instance configuration at ic-server1:3306...

This instance reports its own address as ic-server1:3306

Instance configuration is suitable.
NOTE: Group Replication will communicate with other members using 'ic-server1:3306'. Use the localAddress option to override.

* Checking connectivity and SSL configuration...

Creating InnoDB Cluster 'HmCluster' on 'ic-server1:3306'...

Adding Seed Instance...
Cluster successfully created. Use Cluster.addInstance() to add MySQL instances.
At least 3 instances are needed for the cluster to be able to withstand up to one server failure.
```

---

### 2-6. 클러스터에 멤버 추가

현재 3개 서버 중에서 1개 서버만 클러스터 상태이니, 나머지 2개 서버를 클러스터에 추가하는 작업이다.

클러스터에 인스턴스 추가는 cluster.addInstance() 명령어를 사용해서 진행하면 된다. MySQL Shell이 설치된 클러스터 내 모든 서버에서 진행이 가능하다. (어차피 mysqlsh \connect로 타 인스턴스 접속이 가능하기 때문)

클러스터 인스턴스 추가 시, 바로 추가할 것인지, 기존 서버와 데이터 동기화가 필요한 지, 판단하게 된다. 데이터 동기화가 필요하다고 판단되면, Group Replication에서의 분산 복구를 수행하게 되며, 방식은 사용자가 선택한다.

방식은 총 두 가지이다.

1) 원격 클론 방법 (Default)
2) 바이너리 로그 복제 복구 방식

MySQL Clone은 기증자 인스턴스에서 데이터의 스냅샷을 찍은 다음 스냅샷을 수신자에게 전송한다.

해당 작업은 ic-server1에서 진행한다. (ic-server1에서 ic-server2, ic-server3을 추가하는 매커니즘)

```js
ic-server1:3306 ssl  JS > var cluster = dba.getCluster()
ic-server1:3306 ssl  JS > cluster.addInstance('clusteradm@ic-server2:3306')
```

```
WARNING: A GTID set check of the MySQL instance at 'ic-server2:3306' determined that it contains transactions that do not originate from the cluster, which must be discarded before it can join the cluster.

ic-server2:3306 has the following errant GTIDs that do not exist in the cluster:
e5b4005d-7a04-11ee-8a8e-080027713bdf:1-7

WARNING: Discarding these extra GTID events can either be done manually or by completely overwriting the state of ic-server2:3306 with a physical snapshot from an existing cluster member. To use this method by default, set the 'recoveryMethod' option to 'clone'.

Having extra GTID events is not expected, and it is recommended to investigate this further and ensure that the data can be removed prior to choosing the clone recovery method.

Please select a recovery method [C]lone/[A]bort (default Abort): c
Validating instance configuration at ic-server2:3306...

This instance reports its own address as ic-server2:3306

Instance configuration is suitable.
NOTE: Group Replication will communicate with other members using 'ic-server2:3306'. Use the localAddress option to override.

* Checking connectivity and SSL configuration...
A new instance will be added to the InnoDB Cluster. Depending on the amount of data on the cluster this might take from a few seconds to several hours.

Adding instance to the cluster...

Monitoring recovery process of the new cluster member. Press ^C to stop monitoring and let it continue in background.
Clone based state recovery is now in progress.

NOTE: A server restart is expected to happen as part of the clone process. If the server does not support the RESTART command or does not come back after a while, you may need to manually start it back.

* Waiting for clone to finish...
NOTE: ic-server2:3306 is being cloned from ic-server1:3306
** Stage DROP DATA: Completed
** Clone Transfer 
    FILE COPY  ######################  100%  Compl    PAGE COPY  ######################  100%  Compl    REDO COPY  ######################  100%  Completed
NOTE: ic-server2:3306 is shutting down...

* Waiting for server restart... ready
* ic-server2:3306 has restarted, waiting for clone to finish...
** Stage RESTART: Completed
* Clone process has finished: 74.70 MB transferred in about 1 second (~74.70 MB/s)

State recovery already finished for 'ic-server2:3306'

The instance 'ic-server2:3306' was successfully added to the cluster.
```

# 끝났으면, var cluster = dba.getCluster() cluster.addInstance('clusteradm@ic-server3:3306')도 진행한다.

/*
만약에 var cluster = dba.getCluster() cluster.addInstance() 을 진행하다가
ERROR: Unable to connect to the target instance 'ic-server3:3306'. Please verify the connection settings, make sure the instance is available and try again.
가 발생했다면?

방화벽 문제다. 따라서 접속하려는 서버의 포트를 뚫어야 한다.
*/

```bash
sudo firewall-cmd --permanent --add-port=3306/tcp
sudo firewall-cmd --permanent --add-port=33060/tcp
sudo firewall-cmd --permanent --add-port=33061/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

---

### 2-7. 클러스터 상태 확인

3개 모두 group replication 상태 즉, 클러스터 구성이 되었다. 클러스터 상태를 확인해보자.

ic-server1, ic-server2, ic-server3 셋 중 아무 곳에서 진행하면 됨. 어차피 다 똑같이 나온다.

```js
ic-server1:3306 ssl  JS > var cluster = dba.getCluster()
ic-server1:3306 ssl  JS > cluster.status()
```

```
{
    "clusterName": "HmCluster",
    "defaultReplicaSet": {
        "name": "default",
        "primary": "ic-server1:3306",
        "ssl": "REQUIRED",
        "status": "OK",
        "statusText": "Cluster is ONLINE and can tolerate up to ONE failure.",
        "topology": {
            "ic-server1:3306": {
                "address": "ic-server1:3306",
                "memberRole": "PRIMARY",
                "mode": "R/W",
                "readReplicas": {},
                "replicationLag": "applier_queue_applied",
                "role": "HA",
                "status": "ONLINE",
                "version": "8.0.35"
            },
            "ic-server2:3306": {
                "address": "ic-server2:3306",
                "memberRole": "SECONDARY",
                "mode": "R/O",
                "readReplicas": {},
                "replicationLag": "applier_queue_applied",
                "role": "HA",
                "status": "ONLINE",
                "version": "8.0.35"
            },
            "ic-server3:3306": {
                "address": "ic-server3:3306",
                "memberRole": "SECONDARY",
                "mode": "R/O",
                "readReplicas": {},
                "replicationLag": "applier_queue_applied",
                "role": "HA",
                "status": "ONLINE",
                "version": "8.0.35"
            }
        },
        "topologyMode": "Single-Primary"
    },
    "groupInformationSourceMember": "ic-server1:3306"
}
```

---

## 3. MySQL Router 구성

### 3-1. 사전 필요 패키지 설치

MySQL Router를 구성하기 위해선, 사전 필요 패키지 설치 작업을 해야한다.
ic-router1에서 진행한다.

```bash
yum -y install ncurses ncurses-devel ncurses-libs openssl openssl-devel glibc jq bison make cmake readline gcc gcc-c++ wget autoconf automake libtool* libmcrypt* git telnet patchelf libtirpc* rpcgen numactl numactl-devel ncurses-compat-libs libaio libaio-devel rsyslog
```

### 3-2. 그룹 및 유저 생성

ic-router1에서 진행한다.

```bash
groupadd mysql
useradd -M -s /sbin/nologin -g mysql mysql
```

### 3-3. ulimit, 커널 파라미터 설정

ic-router1에서 진행한다.

`/etc/security/limits.conf` 파일에 아래와 같이 입력
```
mysql    soft   memlock  unlimited
mysql    hard   memlock  unlimited
mysql    hard   nofile   65536
mysql    soft   nofile   65536
mysql    soft   nproc    16384
mysql    hard   nproc    16384
```

`/etc/sysctl.conf` 파일에 아래와 같이 입력 후 적용
```
vm.swappiness=1
net.core.rmem_default = 16777216
net.core.rmem_max = 56777216
net.core.wmem_default = 16777216
net.core.wmem_max = 56777216
net.ipv4.tcp_rmem = 4096 131072 5809920
net.ipv4.tcp_wmem = 4096 16384  4194304
net.nf_conntrack_max = 131072
net.core.netdev_max_backlog = 65535
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
kernel.msgmnb = 1048576
kernel.msgmax = 2097152
net.ipv4.ip_local_port_range = 9000 65000
fs.file-max = 6815744
fs.aio-max-nr = 1048576
```

적용
```bash
sudo sysctl -p
```

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

# 참고 블로그

- [MySQL 설치 블로그](https://blog.naver.com/ricky63/223515480011)
- [InnoDB Cluster 세부 기능 블로그](https://blog.naver.com/ricky63/223517162186) 