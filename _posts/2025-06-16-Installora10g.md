---

title: "Install Oracle 10g"
date: 2025-06-16
categories: \["Categories","Database", "Oracle"]
------------------------------------------------

> **주의**: OS는 CentOS6 이전 버전으로 설치할 것. 이후 버전은 호환 안됨.

## 1. 라이브러리 설치

```bash
yum update

yum install xorg-x11-xauth binutils compat-libstdc++-296 compat-libstdc++-33 elfutils-libelf elfutils-libelf-devel elfutils-libelf-devel-static gcc gcc-c++ glibc glibc-common glibc-devel ksh libaio libaio-devel libgcc libgomp libstdc++ libstdc++-devel make sysstat glibc-headers unixODBC unixODBC-devel pdksh unixODBC.x86_64 compat-gcc-34.x86_64 compat-libstdc++-33.i686 libstdc++-devel.i686 glibc-devel.i686 libaio-devel.i686 unixODBC.i686 libXt.i686 libXtst.i686 ld-linux.so.2 libXp libXp.so.6 libXext libXt.so.6 libXtst.so.6 xterm xclock unzip
```

## 2. 파라미터 & 유저 리소스

### 시스템 카널 파라미터 설정

```bash
vi /etc/sysctl.conf
```

추가 내용:

```bash
kernel.shmmax = 68719476736
kernel.shmall = 10523004
kernel.shmmni = 4096
kernel.sem = 250 32000 100 128
fs.aio-max-nr = 1048576
fs.file-max = 6815744
net.ipv4.ip_local_port_range = 9000 65500
net.core.rmem_default = 262144
net.core.rmem_max = 4194304
net.core.wmem_default = 262144
net.core.wmem_max = 1048586
```

적용:

```bash
/sbin/sysctl -p
```

### 유저 자원 설정

```bash
vi /etc/security/limits.conf
```

```bash
oracle soft nproc 2048
oracle hard nproc 65536
oracle soft nofile 1024
oracle hard nofile 65536
```

### SELINUX 설정 해제

```bash
vi /etc/selinux/config
```

SELINUX=disabled 로 변경.

## 3. 유저, 환경변수, 권한 설정

### Oracle 유저 생성

```bash
groupadd dba
useradd -g dba oracle
passwd oracle
```

### Oracle 설치 디렉터리 구성 & 권한 만정

```bash
mkdir -p /app/oracle
chown -R oracle:dba /app
chmod -R 775 /app
```

### 환경변수 설정

```bash
su - oracle
vi .bash_profile
```

추가:

```bash
umask 022

export DB_UNIQUE_NAME=testdb
export ORACLE_BASE=/app/oracle
export ORACLE_HOME=$ORACLE_BASE/product/10g/dbhome_1
export NLS_LANG=AMERICAN_AMERICA.KO16MSWIN949
export TNS_ADMIN=$ORACLE_HOME/network/admin
export PATH=$PATH:$ORACLE_HOME/bin:$ORACLE_HOME/OPatch
export LD_LIBRARY_PATH=$ORACLE_HOME/lib:/usr/lib:$ORACLE_HOME/network/lib
export ORACLE_SID=testdb

export CLASSPATH=$ORACLE_HOME/JRE:$ORACLE_HOME/jlib:$ORACLE_HOME/rdbms/jlib
export CLASSPATH=$CLASSPATH:$ORACLE_HOME/network/jlib
set -o vi

echo "[ORACLE_SID = $ORACLE_SID ]"
PS1=`hostname`:'${PWD##*/}/ > '

alias ss='sqlplus "/as sysdba"'

export LANG=C
export DISPLAY=192.168.56.1:0.0

stty erase ^H
```

## 4. Oracle 10g 설치 전 이슈 사항

```bash
cpio -idmv < 10201_database_linux_x86_64.cpio
cd database
./runInstaller
```

### 오류 발생 확인

```bash
yum install ld-linux.so.2
vi /etc/redhat-release
yum install libXp.so.6 libXt.so.6 libXtst.so.6
```

## 5. Oracle 10g 설치

### 설치 단계별 진행

#### 1. Installation Type 선택

<p align="center"><img src="/assets/Image/ora10install/1.png" style="margin-bottom:20px;"></p>

#### 2. Inventory Directory 설정

<p align="center"><img src="/assets/Image/ora10install/2.png" style="margin-bottom:20px;"></p>

#### 3. Installation Type 선택 (Enterprise)

<p align="center"><img src="/assets/Image/ora10install/3.png" style="margin-bottom:20px;"></p>

#### 4. Oracle Home 확인

<p align="center"><img src="/assets/Image/ora10install/4.png" style="margin-bottom:20px;"></p>

#### 5. Prerequisite Checks

<p align="center"><img src="/assets/Image/ora10install/5.png" style="margin-bottom:20px;"></p>

#### 6. Installation Option

<p align="center"><img src="/assets/Image/ora10install/6.png" style="margin-bottom:20px;"></p>

#### 7. Summary, 에러 처리

<p align="center"><img src="/assets/Image/ora10install/7.png" style="margin-bottom:20px;"></p>
<p align="center"><img src="/assets/Image/ora10install/8.png" style="margin-bottom:20px;"></p>

#### 8. Root Script 실행 요청 & 터미널 실행

<p align="center"><img src="/assets/Image/ora10install/9.png" style="margin-bottom:20px;"></p>

```bash
[root@localhost lib]# /app/oracle/oraInventory/orainstRoot.sh
[root@localhost lib]# /app/oracle/product/10g/dbhome_1/root.sh
```

#### 9. 설치 완료

<p align="center"><img src="/assets/Image/ora10install/11.png" style="margin-bottom:20px;"></p>

## 6. Oracle 10g 10.2.0.5 패치

```bash
unzip [패치파일명]
cd Disk1/
./runInstaller
```

#### 패치 설치 단계

<p align="center"><img src="/assets/Image/ora10install/12.png" style="margin-bottom:20px;"></p>
<p align="center"><img src="/assets/Image/ora10install/13.png" style="margin-bottom:20px;"></p>
<p align="center"><img src="/assets/Image/ora10install/14.png" style="margin-bottom:20px;"></p>
<p align="center"><img src="/assets/Image/ora10install/15.png" style="margin-bottom:20px;"></p>
<p align="center"><img src="/assets/Image/ora10install/16.png" style="margin-bottom:20px;"></p>
<p align="center"><img src="/assets/Image/ora10install/17.png" style="margin-bottom:20px;"></p>
<p align="center"><img src="/assets/Image/ora10install/18.png" style="margin-bottom:20px;"></p>
<p align="center"><img src="/assets/Image/ora10install/19.png" style="margin-bottom:20px;"></p>

```bash
/app/oraInventory/orainstRoot.sh
```

<p align="center"><img src="/assets/Image/ora10install/20.png" style="margin-bottom:20px;"></p>

## 7. Database Configuration Assistant (DBCA)

```bash
dbca
```

1. Welcome - Next
2. Operations - Create a Database
3. Template - General Purpose
4. Identification - Global Name & SID
5. Management - EM 체크 해제
6. Credentials - 동일 패스워드 설정
7. Storage - File System
8. File Location - oradata 경로 지정
9. Recovery - Flash Recovery 해제
10. Content - Next
11. Initialization Parameters - 문자셋
12. Security - Next
13. Creation - Finish
14. 확인 - OK
15. 완료 - Exit

## 8. Listener 설정

```bash
netca
```

설정 단계:

1. Listener configuration
2. Add 선택 후 Next
3. Listener 이름 설정 (LISTENER)
4. Protocol: TCP 선택
5. Port: 1521 유지
6. More Listeners: No 선택

```bash
lsnrctl status
lsnrctl start
lsnrctl status
```

## 9. DB 인스턴스 확인 및 접속

```bash
ss
```

## 10. Navicat 웹에서 웹제 Oracle 10g 연결

GUI 도구 (Navicat) 을 이용하여 Oracle 10g 데이터베이스에 연결 가능.
