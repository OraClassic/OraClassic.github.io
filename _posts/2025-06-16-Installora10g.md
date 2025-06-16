---
title: "Install Oracle 10g"
date: 2025-06-16
categories: ["Categories","Database", "Oracle"]
---

> **주의**: OS는 CentOS6 이전 버전으로 설치할 것. 이후 버전은 호환 안됨.

## 1. 라이브러리 설치

```bash
yum update

yum install xorg-x11-xauth binutils compat-libstdc++-296 compat-libstdc++-33 elfutils-libelf elfutils-libelf-devel elfutils-libelf-devel-static gcc gcc-c++ glibc glibc-common glibc-devel ksh libaio libaio-devel libgcc libgomp libstdc++ libstdc++-devel make sysstat glibc-headers unixODBC unixODBC-devel pdksh unixODBC.x86_64 compat-gcc-34.x86_64 compat-libstdc++-33.i686 libstdc++-devel.i686 glibc-devel.i686 libaio-devel.i686 unixODBC.i686 libXt.i686 libXtst.i686 ld-linux.so.2 libXp libXp.so.6 libXext libXt.so.6 libXtst.so.6 xterm xclock unzip
```

## 2. 파라미터 & 유저 리소스

### 시스템 커널 파라미터 설정

```bash
vi /etc/sysctl.conf
```

다음 내용을 `/etc/sysctl.conf` 파일에 추가:

```bash
# 공유 메모리 세그먼트 최대 크기를 설정함
kernel.shmmax = 68719476736

# 특정 시점의 시스템에서 사용 가능한 공유 메모리의 최대 크기를 설정함
kernel.shmall = 10523004
kernel.shmmni = 4096
kernel.sem = 250 32000 100 128

# 시스템이 서버에서 처리할 수 있는 최대 비동기 I/O 작업 수
fs.aio-max-nr = 1048576

# 시스템이 어떠한 인스턴스이든, 지원할 수 있는 최대 파일 프로세스
fs.file-max = 6815744

# DB에 연결하려는 포트 범위를 나타냄
net.ipv4.ip_local_port_range = 9000 65500

# TCP를 통해 수신, 전송 소켓 메모리를 정의한 것
net.core.rmem_default = 262144
net.core.rmem_max = 4194304
net.core.wmem_default = 262144
net.core.wmem_max = 1048586
```

변경 후 파라미터 값을 적용:

```bash
/sbin/sysctl -p
```

> **참고**: sysctl은 `/proc/sys/` 파일시스템에 존재하는 파일들의 값을 변경할 수 있는 명령어입니다. `/proc/sys/` 파일시스템은 리눅스의 가상파일시스템으로서 디스크 상에 물리적으로 존재하는 파일 시스템이 아니라 메모리에 존재하는 가상파일시스템으로서 리눅스의 현재 커널 파라미터 값들을 저장하고 있는 일종의 가상 디렉토리입니다.

### 유저 자원 사용 제한값 설정

```bash
vi /etc/security/limits.conf
```

다음 내용을 `/etc/security/limits.conf` 파일에 추가:

```bash
oracle soft nproc 2048
oracle hard nproc 65536
oracle soft nofile 1024
oracle hard nofile 65536
```

**설정 의미**:
- `oracle soft nproc 2048`: oracle 유저는 한번 접속에 soft 세팅으로 2048개의 프로시저를 생성할 수 있음
- `oracle hard nofile 65536`: oracle 유저는 한번 접속에 hard 세팅으로 65536개 파일까지 열 수 있음

> **참고**: limits.conf 설정하는 이유는 하나의 유저에 대해서 할당할 자원량의 한계를 정해주어, 리눅스 시스템의 과부하를 막기 위함입니다. hard는 해당쉘의 최대값을 의미, soft는 현재 설정값을 의미합니다.

### SELINUX 설정 해제

```bash
vi /etc/selinux/config
```

SELINUX 설정을 비활성화로 변경합니다.

> **참고**: SELINUX란, 관리자가 시스템 액세스 권한을 효과적으로 제어할 수 있는 리눅스 보안 강화 아키텍처입니다. 즉, 좀 더 보안적인 룰을 적용시켜 운영할 수 있으나, 해당 설정이 되어있을 경우, 특정 데몬들이 selinux 정책에 막혀 접속이 안될 수 있으므로, selinux를 끕니다.

## 3. 유저, 환경변수, 권한 설정

### Oracle 유저 생성

```bash
groupadd dba
useradd -g dba oracle
passwd oracle
```

> **참고**: 따로 gid, uid 설정 안해주면 default 1001로 들어가게 됩니다. (centos7)

### Oracle 설치 디렉터리 생성 및 권한 설정

```bash
mkdir -p /app/oracle
chown -R oracle:dba /app
chmod -R 775 /app
```

> **참고**: chmod 명령어를 실행한 이유는 `/home/oracle`에서 작업한 것이 아닌, `/app` 디렉토리에서 진행했기 때문입니다.

### Oracle 환경변수 설정

Oracle 계정으로 접속하여 환경변수를 설정:

```bash
su - oracle
vi .bash_profile
```

`.bash_profile` 파일에 다음 내용 추가:

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

#CLASSPATH must include the following JRE locations:
export CLASSPATH=$ORACLE_HOME/JRE:$ORACLE_HOME/jlib:$ORACLE_HOME/rdbms/jlib
export CLASSPATH=$CLASSPATH:$ORACLE_HOME/network/jlib
set -o vi

## ETC Env
echo "[ORACLE_SID = $ORACLE_SID ]"
PS1=`hostname`:'${PWD##*/}/ > '

alias ss='sqlplus "/as sysdba"'

export LANG=C
export DISPLAY=192.168.56.1:0.0

stty erase ^H
```

## 4. Oracle 10g 설치 전 이슈 사항

### 설치 파일 압축 해제

```bash
cpio -idmv < 10201_database_linux_x86_64.cpio
```

### runInstaller 실행

database 디렉토리로 이동해서 runInstaller 실행:

```bash
cd database
./runInstaller
```

### 설치 시 발생 가능한 오류 및 해결방법

1. **`/lib/ld-linux.so.2: bad ELF interpreter` 오류**
   ```bash
   yum install ld-linux.so.2
   ```

2. **`Checking operating system version` 관련 오류**
   ```bash
   vi /etc/redhat-release
   ```
   기존내용 주석처리 후 호환되는 버전으로 수정

3. **`libXp.so.6: cannot open shared object file: No such file or directory` 라이브러리 패키지 없는 이슈**
   ```bash
   yum install libXp.so.6
   ```

4. **`libXt.so.6: cannot open shared object file: No such file or directory` 라이브러리 패키지 없는 이슈**
   ```bash
   yum install libXt.so.6
   ```

5. **`libXtst.so.6: cannot open shared object file: No such file or directory` 라이브러리 패키지 없는 이슈**
   ```bash
   yum install libXtst.so.6
   ```

## 5. Oracle 10g 설치

### 설치 단계별 진행

1. **Installation Type 선택**
   - Advanced Installation 선택 후 Next
![Install](/assets/Image/ora10install/1.png)

2. **Inventory Directory 설정**
   - oraInventory는 Oracle Software 제품에 관한 정보와 Server에 설치되어 있는 Oracle_Home의 정보를 가지고 있는 일종의 Repository
   - inventory directory 경로와 생성한 dba group 확인 후 Next
![Install](/assets/Image/ora10install/2.png)

3. **Installation Type 선택**
   - Enterprise Edition 선택 후 Next
   - Enterprise 옵션은 Oracle 사에서 제공하는 많은 기능을 사용할 수 있고, Standard 옵션은 Enterprise 옵션보다 약한 기능을 사용
![Install](/assets/Image/ora10install/3.png)

4. **Oracle Home 경로 확인**
   - `echo $ORACLE_HOME` 명령어와 비교하여 경로 확인 후 Next
![Install](/assets/Image/ora10install/4.png)

5. **Prerequisite Checks**
   - Oracle 10g Engine 설치를 위해 필수적인 체크 사항
   - 비어있는 상자들에 모두 체크를 눌러주고 Next
![Install](/assets/Image/ora10install/5.png)

6. **Installation Option**
   - Install database Software only를 선택 후 Next
   - 엔진과 DB를 동시에 설치할 것인지, 엔진만 설치할 것인지 선택하는 단계
![Install](/assets/Image/ora10install/6.png)

7. **설치 진행**

   **Summary 화면 확인**
   - 설치 요약 정보를 확인한 후 Install 클릭
![Oracle 설치 Summary 화면](/assets/Image/ora10install/7.png)

   **설치 에러 처리**
   - 설치 도중 `ins_emdb.mk` 설치 에러가 나올 수 있는데 Continue 클릭 (패치하면 잡히는 에러)
![ins_emdb.mk 에러 화면](/assets/Image/ora10install/8.png)

8. **Root Script 실행**
   
   **스크립트 실행 요청**
   - 설치 완료 후 스크립트 실행 요청 화면이 나타남
   - Script Location을 복사 후 root 계정으로 실행
![Root Script 실행 요청 화면](/assets/Image/ora10install/9.png)


   **터미널에서 스크립트 실행**

   ```bash
   # Oracle 설치 후 root 스크립트 실행
   [root@localhost lib]# /app/oracle/oraInventory/orainstRoot.sh
   Changing permissions of /app/oracle/oraInventory to 770.
   Changing groupname of /app/oracle/oraInventory to dba.
   The execution of the script is complete
    
   [root@localhost lib]# /app/oracle/product/10g/dbhome_1/root.sh
   Running Oracle10 root.sh script...
   
   The following environment variables are set as:
     ORACLE_OWNER= oracle
     ORACLE_HOME= /app/oracle/product/10g/dbhome_1
   
   Enter the full pathname of the local bin directory: [/usr/local/bin]:
     Copying dbhome to /usr/local/bin ...
     Copying oraenv to /usr/local/bin ...
     Copying coraenv to /usr/local/bin ...
   
   Creating /etc/oratab file...
   ```

9. **설치 완료**
   - 스크립트 실행 완료 후 OK 클릭
   - Exit 클릭하여 설치 종료
   
   ![설치 완료 화면](/assets/Image/ora10install/11.png)

## 6. Oracle 10g 10.2.0.5 패치

### 패치 설치 진행

1. **패치 파일 압축 해제**
   ```bash
   unzip [패치파일명]
   cd Disk1/
   ./runInstaller
   ```

2. **패치 설치 단계**
   - Next 클릭
   - orainventory 경로 확인 및 group 명 확인 후 Next
   - `echo $ORACLE_HOME` 경로와 비교하여 PATH 확인 후 Next
   - "I wish to receive security updates via My Oracle Support" 체크 해제 후 Next
   - 이메일 관련 팝업창에서 Yes 클릭
   - 체크 안되어 있는 것들 모두 체크 후 Next
   - Install 클릭

3. **Root Script 실행**
   - 해당 스크립트 경로 복사 후 root 계정으로 실행
   - 완료 후 OK 클릭
  ```bash
   /app/oraInventory/orainstRoot.sh
   ```

4. **패치 완료**
   - Exit 클릭

## 7. Database Configuration Assistant

### 데이터베이스 생성

```bash
dbca
```

### DBCA 설정 단계

1. **Welcome** - Next 클릭
2. **Operations** - Create a Database 선택 후 Next
3. **Database Template** - General Purpose 선택 후 Next
4. **Database Identification** - Global Database Name과 SID 설정 후 Next
5. **Management Options** - Enterprise Manager 체크 해제 후 Next
6. **Database Credentials** - 모든 관리자 계정을 동일한 비밀번호로 설정 후 Next
7. **Storage Options** - File System 선택 후 Next
   - File System: OS가 관리
   - Raw Device: Oracle 서비스가 관리
   - ASM: Oracle ASM이 브로커
8. **Database File Locations** - Use Common Location for All Database Files 선택 후, oradata 경로 지정하고 Next
9. **Recovery Configuration** - Flash Recovery Area 체크 해제 후 Next
   - Flash Recovery Area는 Oradata 파일 크기의 2배 정도 공간에 백업파일을 저장할 수 있는 기능
10. **Database Content** - Next 클릭
11. **Initialization Parameters** - Character Sets 설정 후 Next
12. **Security Settings** - Next 클릭
13. **Database Creation** - Finish 클릭
14. **확인** - OK 클릭
15. **완료** - Exit 클릭

## 8. DB Instance 확인 및 netca 설정

### Listener 설정

```bash
netca
```

### NetCA 설정 단계

1. **Configuration Type** - Listener configuration 선택 후 Next
2. **Listener Configuration** - Add 선택 후 Next
3. **Listener Name** - LISTENER 설정 후 Next
4. **Protocol** - TCP 프로토콜만 사용하므로 Next
5. **Port** - 기본 port인 1521로 설정 후 Next
6. **More Listeners** - No 선택 후 Next

### Listener 시작 및 확인

```bash
# 리스너 상태 확인
lsnrctl status

# 리스너 시작
lsnrctl start

# 리스너 상태 재확인
lsnrctl status
```

### Oracle Instance 확인

```bash
# SQLPlus 접속 (bash_profile에서 설정한 alias 사용)
ss
```

bash_profile에서 sqlplus 접속 alias를 설정했기에 `ss` 명령어를 통해 dbca에서 만든 instance가 정상 작동(normal)하는지 확인합니다.

## 9. Navicat을 통해 Oracle 10g 원격 접속하기

Oracle 10g 설치가 완료되면 Navicat과 같은 GUI 도구를 사용하여 원격으로 Oracle 데이터베이스에 접속할 수 있습니다.

---

**설치 완료!** Oracle 10g가 성공적으로 설치되었습니다.
