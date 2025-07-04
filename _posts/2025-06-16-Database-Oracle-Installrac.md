---
title: "Install Oracle RAC"
date: 2025-06-16
categories: ["Categories","Database", "Oracle", "Install"]
taxonomy: Oracle_Install
---


# Oracle RAC 설치 가이드

## Real Application Cluster

![보안 업데이트 설정](/assets/Image/oraRACinstall/1.png)

---

## 0. 설치하기 전 주의사항

1. **RAC 서버 구축할 때 네트워크 쪽 무조건 "NAT 네트워크"로 설정한다.** 일반 NAT으로 하면 root.sh 실행할 때 에러 생김
2. **RAC 2번 구축할 때 1번 복제로 구축했다면, MAC 주소 초기화 시키기** (어댑터 1, 2 둘 다)

![보안 업데이트 설정](/assets/Image/oraRACinstall/2.png)

---

## 1. 고가용성 서비스 종류

### 1) Active-Standby
- 운영중인 시스템에 장애가 발생하였을 경우 대기하고 있던 Standby 서버로 서비스가 전환되어 시스템을 운영하는 방식
- Standby 서버로 전환되어지는 시간동안 서비스 중단이 발생

### 2) Active-Active
- 두 대 이상의 시스템 모두 정상적으로 서비스를 운영하는 방식
- 하나의 시스템에 장애가 발생하더라도 다른 정상적인 시스템들이 운영되어 서비스가 되기 때문에 조금의 시간도 서비스 중단 없이 운영이 가능

### Oracle RAC란?
- RAC는 **Active-Active 방식**을 채택한다
- 클러스터를 이용하여 데이터베이스를 이중화 구성한다
- RAC 기능을 사용하게 되면 클러스터(Grid Infrastructure) 소프트웨어를 이용하여 두 대 이상의 서버를 하나의 데이터베이스 서버로 묶어 사용 가능하다
- 오라클에서는 RAC 환경의 볼륨 관리를 위해 기존의 파일 시스템 방식이 아닌 **자동 스토리지 관리(ASM)** 방식을 사용한다

---

## 2. 시스템 요구사항

![보안 업데이트 설정](/assets/Image/oraRACinstall/3.png)

**주의사항:**
1. Hostname 설정
2. 모든 서버 네트워크 카드 장치명 동일하게 작업

---

## 3. 공유 스토리지 디스크 설정

아래와 같이 모든 서버에서 하드 디스크 5개를 만들어 준다. (한 서버에서 5개의 하드 디스크를 만들고, 나머지 서버가 해당 디스크들을 공유할 수 있게 만든다)

- **CRS 디스크:** 1GB × 3EA
- **DATA 디스크:** 10GB × 1EA  
- **ARCH 디스크:** 5GB × 1EA

> **⚠️ 중요:** 하드 디스크 만들 때, 동적 할당 하드 디스크가 아니라 **'고정 크기'** 하드 디스크로 만들어야 한다.

### 설정 순서
1. ORARAC

![보안 업데이트 설정](/assets/Image/oraRACinstall/4.png)
2. ORARAC2

![보안 업데이트 설정](/assets/Image/oraRACinstall/5.png)
3. ORARAC3

![보안 업데이트 설정](/assets/Image/oraRACinstall/6.png)
4. 다 설정 후, 공유 디스크 관리자에서 5개 디스크들 모두 **'공유 가능'**으로 바꿔주기

![보안 업데이트 설정](/assets/Image/oraRACinstall/7.png)

---

## 4. OS 설정

![보안 업데이트 설정](/assets/Image/oraRACinstall/8.png)

### 시스템 확인
```bash
# 물리 메모리 확인
grep MemTotal /proc/meminfo

# swap 메모리 확인
grep SwapTotal /proc/meminfo

# 디렉토리 사이즈 확인
df -h /tmp
```

### 패키지 설치 (RAC 1번, 2번 노드 동일하게 작업)
```bash
yum install -y bc binutils elfutils-libelf elfutils-libelf-devel fontconfig-devel glibc glibc-devel ksh libaio libaio-devel libXrender libX11 libXau libXi libXtst libgcc libnsl librdmacm libstdc++ libstdc++-devel libxcb libibverbs make smartmontools sysstat libnsl2

yum install lib*

yum --enablerepo=ol8_codeready_builder install -y libnsl2-devel
```

### hosts 파일 설정 (RAC 1번, 2번 노드 동일하게 작업)
```bash
vi /etc/hosts
```

```bash
### Public IP ###
192.168.56.10   oraser01
192.168.56.11   oraser02

### Private ###
10.10.10.10     oraser01-priv
10.10.10.20     oraser02-priv

### Virtual IP ###
192.168.56.103  oraser01-vip
192.168.56.104  oraser02-vip

### Scan IP ###
192.168.56.13   oraser-scan
```

### 커널 파라미터 설정 (RAC 1번, 2번 노드 동일하게 작업)
```bash
vi /etc/sysctl.conf
```

```bash
kernel.shmmax = 2147483648
kernel.shmall = 943749
kernel.shmmni = 4096
kernel.sem = 250 32000 100 128
kernel.panic_on_oops = 1
fs.file-max = 6815744
fs.aio-max-nr = 1048576
net.core.rmem_default = 262144
net.core.rmem_max = 4194304
net.core.wmem_default = 262144
net.core.wmem_max = 1048576
net.ipv4.ip_local_port_range = 9000 65500
```

```bash
# 설정 적용
sysctl -p
```

### 리소스 제한 설정 (RAC 1번, 2번 노드 동일하게 작업) 
```bash
vi /etc/security/limits.conf
```

```bash
oracle soft nofile 1024
oracle hard nofile 65536
oracle soft nproc 2047
oracle hard nproc 16384
oracle soft stack 10240
oracle hard stack 32768
oracle soft memlock 3774874
oracle hard memlock 3774874
```

### 네트워크 설정 (RAC 1번, 2번 노드 동일하게 작업)
```bash
vi /etc/sysconfig/network
```

```bash
NOZEROCONF=yes
```

### ASM 라이브러리 설치 (RAC 1번, 2번 노드 동일하게 작업)
```bash
# ASM 라이브러리 설치
rpm -ivh oracleasmlib-2.0.17-1.el8.x86_64.rpm

# 의존성 때문에 설치가 안되면, 아래 설치하고 다시 ASM 라이브러리 설치해보기
yum install oracleasm

# ASM Support 설치  
rpm -ivh oracleasm-support-2.1.12-1.el8.x86_64.rpm
```

### 방화벽 & SELinux 설정 (RAC 1번, 2번 노드 동일하게 작업)
```bash
vi /etc/selinux/config
```

```bash
SELINUX=disabled
SELINUXTYPE=targeted
```

```bash
systemctl stop firewalld
```

### avahi-daemon 해제 (RAC 1번, 2번 노드 동일하게 작업)
```bash
# avahi-daemon 중지
systemctl stop avahi-daemon

# avahi-daemon 상태 비활성화
systemctl disable avahi-daemon
```

---

## 5. 오라클 설정

### 디렉토리 구조
- 오라클 사용자 홈 디렉토리: `/oracle`
- 오라클 소프트웨어 홈 디렉토리: `/oracle/db/19c`
- 오라클 그리드 홈 디렉토리: `/oracle/grid/19c`
- 오라클 데이터 디스크 그룹: `DATA`
- 오라클 아카이브로그 디스크 그룹: `ARCH`
- 오라클 그리드 디스크 그룹: `CRS`
- 오라클 관리 그룹: `dba`
- 오라클 사용 유저: `oracle`

> **⚠️ 중요:** ORACLE 유저 환경 변수 설정할 때, ORACLE_SID 부분은 잘 확인할 것. dbca에서 데이터베이스 생성할 때 해당 변수를 따라가기 때문임.
> 
> 예: 1번 인스턴스의 ORACLE_SID가 ORCL1이고, 2번 인스턴스의 ORACLE_SID가 ORCL2라면, dbca에서 db 생성할 때 이름은 ORCL로 해야 한다.

### 디렉토리 생성
```bash
# 1번 서버
mkdir -p /oracle/db/19c
mkdir -p /oracle/grid/19c

# 2번 서버
mkdir -p /oracle/db/19c
mkdir -p /oracle/grid/19c
```

### OS 유저 및 그룹 생성
```bash
# 1번, 2번 서버 모두
groupadd -g 500 dba
useradd -u 500 -g dba oracle
passwd oracle
```

### 디렉토리 권한 설정
```bash
# 1번, 2번 서버 모두
chown oracle:dba -R /oracle
chmod -R 775 /oracle
```

### 환경변수 설정

#### 1번 서버
```bash
su - oracle
vi .bash_profile
```

```bash
# .bash_profile
# Get the aliases and functions
if [ -f ~/.bashrc ]; then
    . ~/.bashrc
fi

# User specific environment and startup programs
umask 022
export ORACLE_SID=ORCL1
export ORACLE_UNQNAME=ORCL
export ORACLE_BASE=/oracle/db
export ORACLE_HOME=/oracle/db/19c
export GRID_HOME=/oracle/grid/19c
export ORACLE_TERM=vt100
export ORACLE_OWNER=oracle
export EDITOR=vi
export NLS_LANG=AMERICAN_AMERICA.KO16MSWIN949
export TNS_ADMIN=$ORACLE_HOME/network/admin
export LD_LIBRARY_PATH=$ORACLE_HOME/lib:/lib:/usr/lib:/usr/X11R6/lib
export PATH=$ORACLE_HOME/OPatch:$ORACLE_HOME/bin:/bin:/usr/bin:/sbin:/usr/sbin:/usr/local/bin:/usr/X11R6/bin:$PATH:.
export LANG=C
export CV_ASSUME_DISTID=RHEL7.6
PS1='[${ORACLE_SID}]$PWD> '
export DISPLAY=[디스플레이를 표시하고자 하는 PC의 IP주소]:0.0

```

```bash
# 1번 서버 환경변수 적용
. .bash_profile
```

#### 2번 서버
```bash
# ORACLE_SID=ORCL2로 설정하는 것 외에는 동일
export ORACLE_SID=ORCL2
```

```bash
# 2번 서버 환경변수 적용
. .bash_profile
```

---

## 6. 자동 스토리지 관리(ASM) 디스크 그룹 설정

### 1번 서버 ORACLEASM 설정
```bash
# ORACLEASM 상태 확인
oracleasm configure

# ORACLEASM 상태 확인 출력
ORACLEASM_ENABLED=false
ORACLEASM_UID=
ORACLEASM_GID=
ORACLEASM_SCANBOOT=true
ORACLEASM_SCANORDER=""
ORACLEASM_SCANEXCLUDE=""
ORACLEASM_SCAN_DIRECTORIES=""
ORACLEASM_USE_LOGICAL_BLOCK_SIZE="false"

# ORACLEASM 설정
oracleasm configure -i
# Default user: oracle
# Default group: dba
# Start on boot: y
# Scan on boot: y

# ORACLEASM 상태 재확인
oracleasm configure

# ORACLEASM 상태 재확인 아래와 같이 나오면 정상
ORACLEASM_ENABLED=true
ORACLEASM_UID=oracle
ORACLEASM_GID=dba
ORACLEASM_SCANBOOT=true
ORACLEASM_SCANORDER=""
ORACLEASM_SCANEXCLUDE=""
ORACLEASM_SCAN_DIRECTORIES=""
ORACLEASM_USE_LOGICAL_BLOCK_SIZE="false"

# ASM Mount Point 설정
oracleasm init

# ASM Mount Point 설정 아래와 같이 나오면 정상
Creating /dev/oracleasm mount point: /dev/oracleasm
Loading module "oracleasm": oracleasm
Configuring "oracleasm" to use device physical block size
Mounting ASMlib driver filesystem: /dev/oracleasm
```

### 1번 서버 Raw Device 설정
```bash
cd /dev
ls -la sd*

# ls 출력 리스트
brw-rw---- 1 root disk 8, 16 Mar  3 22:33 sdb
brw-rw---- 1 root disk 8, 32 Mar  3 22:33 sdc
brw-rw---- 1 root disk 8, 48 Mar  3 22:33 sdd
brw-rw---- 1 root disk 8, 64 Mar  3 22:33 sde
brw-rw---- 1 root disk 8, 80 Mar  3 22:33 sdf

# 각 디스크에 파티션 생성
fdisk /dev/sdb
# n -> p -> 1 -> 2048 -> 2097151 -> w

# 아래는 설정 과정
[root@oraser01 dev]# fdisk /dev/sdb
Command (m for help): n
Partition type
   p   primary (0 primary, 0 extended, 4 free)
   e   extended (container for logical partitions)
Select (default p): p
Partition number (1-4, default 1): 1
First sector (2048-2097151, default 2048): 2048
Last sector, +sectors or +size{K,M,G,T,P} (2048-2097151, default 2097151): 2097151
Created a new partition 1 of type 'Linux' and of size 1023 MiB.
Command (m for help): w
The partition table has been altered.
Calling ioctl() to re-read partition table.
Syncing disks.

[root@oraser01 dev]# fdisk /dev/sdc
Command (m for help): n
Partition type
   p   primary (0 primary, 0 extended, 4 free)
   e   extended (container for logical partitions)
Select (default p): p
Partition number (1-4, default 1): 1
First sector (2048-2097151, default 2048): 2048
Last sector, +sectors or +size{K,M,G,T,P} (2048-2097151, default 2097151): 2097151
Created a new partition 1 of type 'Linux' and of size 1023 MiB.
Command (m for help): w
The partition table has been altered.
Calling ioctl() to re-read partition table.
Syncing disks.

# sdc, sdd, sde, sdf에도 동일하게 작업 적용

# 작업 후에 다시 Raw Devce 확인
ls -la sd*

# 아래와 같이 출력되었다면 정상 
brw-rw---- 1 root disk 8, 16 Mar  3 22:35 sdb
brw-rw---- 1 root disk 8, 17 Mar  3 22:35 sdb1
brw-rw---- 1 root disk 8, 32 Mar  3 22:35 sdc
brw-rw---- 1 root disk 8, 33 Mar  3 22:35 sdc1
brw-rw---- 1 root disk 8, 48 Mar  3 22:36 sdd
brw-rw---- 1 root disk 8, 49 Mar  3 22:36 sdd1
brw-rw---- 1 root disk 8, 64 Mar  3 22:36 sde
brw-rw---- 1 root disk 8, 65 Mar  3 22:36 sde1
brw-rw---- 1 root disk 8, 80 Mar  3 22:37 sdf
brw-rw---- 1 root disk 8, 81 Mar  3 22:37 sdf1
```

### 1번 서버 디스크 그룹 설정
```bash
# 어떤 디스크가 CRS 인지, DATA 인지, ARCH 인지 확인 하고 생성해야 한다. 
fdisk -l

# 크기별로 확인 후 적절히 할당 (삭제할 때는 oracleasm delete disk [alias])
oracleasm createdisk CRS01 /dev/sdb1
oracleasm createdisk CRS02 /dev/sdc1
oracleasm createdisk CRS03 /dev/sdd1
oracleasm createdisk DATA01 /dev/sde1
oracleasm createdisk ARCH01 /dev/sdf1

# 디스크 스캔
oracleasm scandisks

# 디스크 그룹 확인
oracleasm listdisks

# 아래와 같이 출력되면 정상
ARCH01
CRS01
CRS02
CRS03
DATA01
```

### 2번 서버 디스크 그룹 설정
```bash
# ORACLEASM 설정 
oracleasm configure -i

# ORACLEASM 아래와 같이 설정
Default user to own the driver interface []: oracle
Default group to own the driver interface []: dba
Start Oracle ASM library driver on boot (y/n) [n]: y
Scan for Oracle ASM disks on boot (y/n) [y]: y
Writing Oracle ASM library driver configuration: done

# ORACLEASM 설정 과정
Default user to own the driver interface []: oracle
Default group to own the driver interface []: dba
Start Oracle ASM library driver on boot (y/n) [n]: y
Scan for Oracle ASM disks on boot (y/n) [y]: y
Writing Oracle ASM library driver configuration: done

# ORACLEASM 설정 확인
oracleasm configure

# 아래와 같이 출력되면 정상
ORACLEASM_ENABLED=true
ORACLEASM_UID=oracle
ORACLEASM_GID=dba
ORACLEASM_SCANBOOT=true
ORACLEASM_SCANORDER=""
ORACLEASM_SCANEXCLUDE=""
ORACLEASM_SCAN_DIRECTORIES=""
ORACLEASM_USE_LOGICAL_BLOCK_SIZE="false"

# ASM Mount Point 설정
oracleasm init

# ASM Mount Point 아래와 같이 설정
Creating /dev/oracleasm mount point: /dev/oracleasm
Loading module "oracleasm": oracleasm
Configuring "oracleasm" to use device physical block size
Mounting ASMlib driver filesystem: /dev/oracleasm

# 디스크 그룹 스캔
oracleasm scandisks

# 디스크 그룹 스캔 아래와 같이 출력이면 정상
Reloading disk partitions: done
Cleaning any stale ASM disks...
Scanning system for ASM disks...
Instantiating disk "DATA01"
Instantiating disk "CRS03"
Instantiating disk "ARCH01"
Instantiating disk "CRS02"
Instantiating disk "CRS01"

# 디스크 그룹 확인
oracleasm listdisks

# 디스크 그룹 확인 아래와 같이 출력이면 정상
ARCH01
CRS01
CRS02
CRS03
DATA01

​
```

---

## 7. 그리드 인프라스트럭처 설치
- 그리드 인프라스트럭처 설치는 RAC 1번 서버에서 진행.
- 2번 서버의 설치는  SSH를 이용해서 오라클이 네트워크를 통해서 설치를 진행

### 사전 준비
```bash
# 서비스 중지 (Master, Slave)
systemctl stop firewalld
systemctl stop chronyd

# unzip 설치
yum install unzip

# 설치파일 압축 해제
cd /oracle/grid/19c
unzip LINUX.X64_193000_grid_home.zip

# RPM 설치 (root 계정으로)
rpm -ivh /oracle/grid/19c/cv/rpm/cvuqdisk-1.0.10-1.rpm

# 권한 설정
chown -R oracle:dba /oracle
chmod -R 775 /oracle
```

### SSH 설정 (RAC 1번, 2번 노드 동일하게 작업)
```bash
cd $GRID_HOME/oui/prov/resources/scripts
./sshUserSetup.sh -user oracle -hosts "oraser01 oraser02" -noPromptPassphrase -advanced
```

### 그리드 설치 실행
```bash
cd $GRID_HOME
./gridSetup.sh
```

### RAC 1번, 2번 노드 모두 oracleasm listdisks 맞는지 재확인
```bash
oracleasm listdisks
```

> **⚠️ 중요:** root.sh 쉘 스크립트 실행 시 에러 발생하면 무조건 에러를 잡고 NEXT 하기. 로그를 보면서 어떤 부분이 문제인지 파악하는 것이 중요.


![보안 업데이트 설정](/assets/Image/oraRACinstall/9.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/10.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/11.png)

```bash
# 참고. https://dataforum.io/display/ORCL/19c+RAC+Silent+%3A+01.+Grid+Install

[ORCL1]/home/oracle> cd $GRID_HOME/oui/prov/resources/scripts
[ORCL1]/oralce/grid/19c/oui/prov/resources/scripts> ./sshUserSetup.sh -user oracle -hosts "oraser01 oraser02" -noPromptPassphrase -advanced
```

- enp0s3: ASM & Private
- enp0s8: Public

![보안 업데이트 설정](/assets/Image/oraRACinstall/12.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/13.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/14.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/15.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/16.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/17.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/18.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/19.png)

```bash
# INS-13016, INS-20802, INS-43080 등 오류 발생

# oinstall 그룹 생성
/oracle/oraInventory/orainstRoot.sh

# RPM 설치 Master, Slave (root 계정)
rpm -ivh /oracle/grid/19c/cv/rpm/cvuqdisk-1.0.10-1.rpm        

# ssh 수동 설정 (Master, Slave 모두 다)
[ORCL1]/home/oracle> cd $GRID_HOME/oui/prov/resources/scripts
[ORCL1]/oracle/grid/19c/oui/prov/resources/scripts> ./sshUserSetup.sh -user oracle -hosts "oraser01 oraser02" -noPromptPassphrase -advanced
```

![보안 업데이트 설정](/assets/Image/oraRACinstall/20.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/21.png)


---

## 8. ASM 디스크 그룹 생성

### ASMCA 실행 (안되면 해당 경로 권한 확인하거나, oracle로 바꾸고 실행
```bash
su - oracle
cd $GRID_HOME/bin
./asmca
```

### 디스크 그룹 정보
- **ASM Instance:** 각 서버에 기동되어 있는 ASM 인스턴스의 정보 확인
- **Disk Groups:** 현재 구성된 디스크 그룹 및 새로운 디스크 그룹 생성 및 삭제
- **Settings:** ASM 설정

** 실행했을 때, 그리드가 잘 깔렸다면 아래처럼 인스턴스가 2개 뜬다. **
![보안 업데이트 설정](/assets/Image/oraRACinstall/22.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/23.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/24.png)

### 상태 확인
```bash
crsctl stat res -t

# 결과 리스트
--------------------------------------------------------------------------------

Name           Target  State        Server                   State details      

--------------------------------------------------------------------------------

Local Resources

--------------------------------------------------------------------------------

ora.LISTENER.lsnr

               ONLINE  ONLINE       oraser01                 STABLE

               ONLINE  ONLINE       oraser02                 STABLE

ora.chad

               ONLINE  ONLINE       oraser01                 STABLE

               ONLINE  ONLINE       oraser02                 STABLE

ora.net1.network

               ONLINE  ONLINE       oraser01                 STABLE

               ONLINE  ONLINE       oraser02                 STABLE

ora.ons

               ONLINE  ONLINE       oraser01                 STABLE

               ONLINE  ONLINE       oraser02                 STABLE

--------------------------------------------------------------------------------

Cluster Resources

--------------------------------------------------------------------------------

ora.ARCH.dg(ora.asmgroup)

      1        ONLINE  ONLINE       oraser01                 STABLE

      2        ONLINE  ONLINE       oraser02                 STABLE

      3        ONLINE  OFFLINE                               STABLE

ora.ASMNET1LSNR_ASM.lsnr(ora.asmgroup)

      1        ONLINE  ONLINE       oraser01                 STABLE

      2        ONLINE  ONLINE       oraser02                 STABLE

      3        OFFLINE OFFLINE                               STABLE

ora.CRS.dg(ora.asmgroup)

      1        ONLINE  ONLINE       oraser01                 STABLE

      2        ONLINE  ONLINE       oraser02                 STABLE

      3        OFFLINE OFFLINE                               STABLE

ora.DATA.dg(ora.asmgroup)

      1        ONLINE  ONLINE       oraser01                 STABLE

      2        ONLINE  ONLINE       oraser02                 STABLE

      3        ONLINE  OFFLINE                               STABLE

ora.LISTENER_SCAN1.lsnr

      1        ONLINE  ONLINE       oraser01                 STABLE

ora.asm(ora.asmgroup)

      1        ONLINE  ONLINE       oraser01                 Started,STABLE

      2        ONLINE  ONLINE       oraser02                 Started,STABLE

      3        OFFLINE OFFLINE                               STABLE

ora.asmnet1.asmnetwork(ora.asmgroup)

      1        ONLINE  ONLINE       oraser01                 STABLE

      2        ONLINE  ONLINE       oraser02                 STABLE

      3        OFFLINE OFFLINE                               STABLE

ora.cvu

      1        ONLINE  ONLINE       oraser01                 STABLE

ora.oraser01.vip

      1        ONLINE  ONLINE       oraser01                 STABLE

ora.oraser02.vip

      1        ONLINE  ONLINE       oraser02                 STABLE

ora.qosmserver

      1        ONLINE  ONLINE       oraser01                 STABLE

ora.scan1.vip

      1        ONLINE  ONLINE       oraser01                 STABLE

--------------------------------------------------------------------------------
```

---

## 9. Oracle 19c Engine & DB 설치

### 19c Engine 설치
```bash
cd /oracle/db/19c/
unzip LINUX.X64_193000_db_home.zip
chown -R oracle:dba /oracle/db

# 설치 파일 실행
./runInstaller
```

![보안 업데이트 설정](/assets/Image/oraRACinstall/25.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/26.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/27.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/28.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/29.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/30.png)


### DBCA로 데이터베이스 생성
```bash
dbca
```

![보안 업데이트 설정](/assets/Image/oraRACinstall/31.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/31.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/33.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/34.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/35.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/36.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/37.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/38.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/39.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/40.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/41.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/42.png)

![보안 업데이트 설정](/assets/Image/oraRACinstall/43.png)


### DB 상태 확인
```sql
sqlplus / as sysdba

SQL> select instance_name, version, status from gv$instance;

INSTANCE_N VERSION    STATUS
---------- ---------- ----------
racdb1     19.0.0.0.0 OPEN
racdb2     19.0.0.0.0 OPEN
```

---

## 10. 데이터 파일, 컨트롤 파일 위치 확인

Oracle RAC는 ASM(Automatic Storage Management)을 사용하여 데이터 파일, 컨트롤 파일, 로그 파일을 저장한다.

```sql
SELECT * FROM V$CONTROLFILE;
```

결과에서 `+DATA`는 ASM 디스크 그룹을 나타낸다. ASM 디스크 그룹은 파일 시스템 경로가 아니라 ASM 인스턴스에 의해 관리되는 스토리지 풀이다. 
따라서 물리적인 방법으로 찾을 수는 없다. 대신 ASMCMD 명령어를 이용해서 해당 파일들을 확인할 수 있다.

### ASMCMD를 통한 파일 확인
```bash
# ASM 디스크 그룹 목록 확인
asmcmd ls

# ASM 디스크 그룹 내 파일 목록 조회
asmcmd ls +DATA/SPECTRA/CONTROLFILE/
```

---

## 참고 자료
- [19c RAC Silent 설치 가이드](https://dataforum.io/display/ORCL/19c+RAC+Silent+%3A+01.+Grid+Install)
- [ZEROCONF 설정 참고](https://rakuraku.tistory.com/119)
