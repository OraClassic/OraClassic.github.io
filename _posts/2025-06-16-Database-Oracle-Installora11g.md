---

title: "Install Oracle 11g"
date: 2025-06-16
categories: ["Categories","Database", "Oracle", "Install"]
---


> **환경:** CentOS 7, RAM 8GB

## 1. 의존 라이브러리 설치

```bash
yum -y install compat-libstdc++-33.x86_64 binutils elfutils-libelf elfutils-libelf-devel glibc glibc-common glibc-devel glibc-headers gcc gcc-c++ libaio-devel libaio libgcc libstdc++ libstdc++ make sysstat unixODBC unixODBC-devel unzip
```

## 2. 파라미터 및 유저 리소스 설정

### 시스템 커널 파라미터 설정

```bash
vi /etc/sysctl.conf
```

다음 내용을 추가:

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

변경 후 파라미터 값 적용:

```bash
/sbin/sysctl -p
```

> **참고:** sysctl은 `/proc/sys/` 파일시스템에 존재하는 파일들의 값을 변경할 수 있는 명령어입니다. `/proc/sys/` 파일시스템은 리눅스의 가상파일시스템으로서 현재 커널 파라미터 값들을 저장하고 있습니다.

### 유저 자원 사용 제한값 설정

```bash
vi /etc/security/limits.conf
```

다음 내용을 추가:

```bash
oracle soft nproc 2048
oracle hard nproc 65536
oracle soft nofile 1024
oracle hard nofile 65536
```

- `oracle soft nproc 2048`: oracle 유저는 한번 접속에 soft 세팅으로 2048개의 프로시저를 생성할 수 있음
- `oracle hard nofile 65536`: oracle 유저는 한번 접속에 hard 세팅으로 65536개 파일까지 열 수 있음

> **참고:** hard는 해당 쉘의 최대값을 의미하고, soft는 현재 설정값을 의미합니다.

### SELINUX 설정 해제

```bash
vi /etc/selinux/config
```

다음과 같이 변경:

```bash
SELINUX=disabled
```

> **참고:** SELINUX는 관리자가 시스템 액세스 권한을 효과적으로 제어할 수 있는 리눅스 보안 강화 아키텍처입니다. 특정 데몬들이 selinux 정책에 막혀 접속이 안될 수 있으므로 해제합니다.

## 3. 유저 생성, 환경변수 설정, 권한 설정

### Oracle 유저 및 그룹 생성

```bash
groupadd dba
useradd -g dba oracle
passwd oracle
```

> **참고:** 따로 gid, uid 설정 안해주면 default 1001로 들어가게 됩니다. (CentOS 7)

### 디렉터리 생성 및 권한 설정

```bash
mkdir -p /app/oracle
chown -R oracle:dba /app
chmod -R 775 /app
```

### Oracle 환경변수 설정

Oracle 계정으로 접속:

```bash
su - oracle
vi .bash_profile
```

다음 내용을 추가:

```bash
umask 022

export DB_UNIQUE_NAME=testdb
export ORACLE_BASE=/app/oracle
export ORACLE_HOME=$ORACLE_BASE/product/11.2.0/dbhome_1
export NLS_LANG=AMERICAN_AMERICA.KO16MSWIN949
export TNS_ADMIN=$ORACLE_HOME/network/admin
export PATH=$PATH:$ORACLE_HOME/bin:$ORACLE_HOME/OPatch
export LD_LIBRARY_PATH=$ORACLE_HOME/lib:/usr/lib:$ORACLE_HOME/network/lib
export ORACLE_SID=testdb

# CLASSPATH must include the following JRE locations:
export CLASSPATH=$ORACLE_HOME/JRE:$ORACLE_HOME/jlib:$ORACLE_HOME/rdbms/jlib
export CLASSPATH=$CLASSPATH:$ORACLE_HOME/network/jlib
set -o vi

## ETC Env
echo "[ORACLE_SID = $ORACLE_SID ]"
PS1=`hostname`:'${PWD##*/}/ > '

alias ss='sqlplus "/as sysdba"'

export LANG=C
export DISPLAY=192.168.56.1:0.0
```

## 4. Oracle 엔진 설치

### 설치 파일 압축 해제

```bash
unzip linux.x64_11gR2_database_1of2.zip
unzip linux.x64_11gR2_database_2of2.zip
```

### 설치 시작

```bash
cd database
./runInstaller
```

### 설치 단계별 진행

1. **보안 업데이트 설정**: 빨간색 콤보박스 체크 해제 후 NEXT
2. **설치 옵션**: "Install database software only" 체크 후 NEXT
3. **데이터베이스 설치 옵션**: "Single Instance database Installation" 체크 후 NEXT
4. **언어 선택**: "Korean"을 Available Languages에서 Selected Languages로 이동 후 NEXT
5. **데이터베이스 에디션**: "Enterprise Edition" 체크 후 NEXT
6. **설치 위치**: Bash_profile에서 설정한 ORACLE_BASE, ORACLE_HOME 확인 후 NEXT
7. **인벤토리 생성**: 경로 체크 후 NEXT
8. **운영 체제 그룹**: 생성한 그룹명 확인 후 NEXT
9. **전제 조건 검사**: 빨간색 박스 체크 후 NEXT
10. **요약**: 최종 확인 후 FINISH

### 설치 중 오류 해결

#### 84% 지점 오류 해결

설치 도중 84% 지점에서 오류가 발생할 수 있습니다.

```bash
cd /app/product/11.2.0/dbhome_1/ctx/lib
vi ins_ctx.mk
```

다음 구문을 찾아서:
```bash
ctxhx: $(CTXHXOBJ)     

   $(LINK_CTXHX) $(CTXHXOBJ) $(INSO_LINK) 
```

다음과 같이 수정:
```bash
ctxhx: $(CTXHXOBJ)     

   -static $(LINK_CTXHX) $(CTXHXOBJ) $(INSO_LINK) 
```

#### 추가 오류 해결

```bash
cd app/oracle/product/11.2.0/dbhome_1/sysman/lib
vi ins_emagent.mk
```

다음 구문을 찾아서:
```bash
$(SYSMANBIN) emdctl:     

   $(MK_EMAGENT_NMECTL) 
```

다음과 같이 수정:
```bash
$(SYSMANBIN) emdctl:     

   $(MK_EMAGENT_NMECTL) -lnnz11 
```

#### 스크립트 실행

설치 완료 후 root 계정으로 다음 스크립트들을 실행:

```bash
/app/oracle/oraInventory/orainstRoot.sh
/app/oracle/product/11.2.0/dbhome_1/root.sh
```

### 환경변수 적용

```bash
source ~/.bash_profile
```

## 5. 리스너 설정

### 리스너 생성

```bash
cd /app/oracle/product/11.2.0/dbhome_1/bin
./netca
```

또는 단순히:

```bash
netca
```

### 리스너 설정 단계

1. "Listener configuration" 선택 후 Next
2. Add 선택 후 Next
3. 리스너 이름 확인 후 Next
4. 프로토콜 선택 후 Next
5. Oracle 기본 port 1521 확인 후 Next
6. 추가 리스너 문의에 "No" 체크 후 Next
7. Listener Configuration Done 화면에서 Next
8. Finish로 창 종료

## 6. 데이터베이스 생성

### Database Configuration Assistant 실행

```bash
dbca
```

### 데이터베이스 생성 단계

1. Welcome 화면에서 Next
2. "Create a Database" 선택 후 Next
3. "General Purpose or Transaction Processing" 선택 후 Next
4. .bash_profile에서 설정한 SID 네임 설정 후 Next
5. Management Options에서 Next
6. "Use the Same Administrative Password for All Accounts" 선택 후 비밀번호 설정
7. Password 확인 창에서 Yes 클릭
8. "Use Common Location for All Database Files" 선택 후 oradata 경로 지정
9. Recovery Configuration에서 Next
10. Database Content에서 Next
11. Initialization Parameters에서 "Sizing" 클릭 후 설정
12. "Character Sets" 클릭 후 설정
13. "Connection Mode" 클릭 후 설정
14. Creation Options에서 Next
15. Database Creation Summary에서 Finish
16. 최종 확인 후 OK
17. 설치 완료 후 Exit

## 7. 데이터베이스 및 리스너 실행

### 데이터베이스 접속 및 제어

```bash
# SQLPlus 접속 (별칭 사용)
ss

# 데이터베이스 종료
SQL> shutdown immediate

# 데이터베이스 시작
SQL> startup
```

### 리스너 제어

```bash
# 리스너 시작
lsnrctl start

# 리스너 종료
lsnrctl stop

# 리스너 상태 확인
lsnrctl status
```

## 8. Navicat을 통한 Oracle 11g 원격 접속

### listener.ora 파일 수정

리스너 상태 확인 시 "The listener supports no services" 메시지가 나타나면 listener.ora 파일을 수정해야 합니다.

```bash
vi $ORACLE_HOME/network/admin/listener.ora
```

다음 내용을 추가:

```bash
SID_LIST_LISTENER =
  (SID_LIST =
    (SID_DESC =
      (GLOBAL_DBNAME = testdb)
      (ORACLE_HOME = /app/oracle/product/11.2.0/dbhome_1)
      (SID_NAME = testdb)
    )
  )
```

리스너 재시작:

```bash
lsnrctl stop
lsnrctl start
lsnrctl status
```

### Navicat 설정

1. Navicat에서 "연결" 버튼 클릭
2. "Oracle" 선택
3. 연결 정보 입력:
   - **호스트**: Oracle DB 서버 IP
   - **서비스 이름**: 생성한 인스턴스 이름 (testdb)
   - **사용자 이름**: sys
   - **비밀번호**: 설정한 관리자 비밀번호
4. "고급" 탭에서 역할을 "SYSDBA"로 변경
5. "테스트 연결"로 연결 확인
6. 연결 성공 시 "확인" 클릭

## 주요 명령어 정리

### 환경 확인
```bash
echo $ORACLE_BASE    # Oracle Base 경로 확인
echo $ORACLE_HOME    # Oracle Home 경로 확인  
echo $ORACLE_SID     # Oracle SID 확인
```

### 리스너 관리
```bash
lsnrctl start        # 리스너 시작
lsnrctl stop         # 리스너 종료
lsnrctl status       # 리스너 상태 확인
```

### 데이터베이스 관리
```bash
ss                   # SQLPlus 접속 (별칭)
sqlplus / as sysdba  # SQLPlus 직접 접속
shutdown immediate   # DB 종료
startup             # DB 시작
```

---

**설치 완료!** 이제 CentOS 7에서 Oracle 11g가 정상적으로 설치되고 실행됩니다.
