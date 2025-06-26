---
title: "Install Oracle 19c"
date: 2025-06-16
categories: ["Categories","Database", "Oracle", "Install"]
---

# Oracle 19c CentOS7 설치 가이드

## 1. Oracle Database Preinstall 설치

Oracle Database Preinstall 패키지는 복잡한 Oracle Database 설치 전 기본 세팅들을 자동 설정해주는 RPM 패키지입니다.

해당 패키지를 설치하지 않고 직접 하나하나 설정해줄 수 있지만, 웬만해서는 Preinstall 패키지를 통해 기본 세팅들을 자동 설정하는 것을 권장합니다.

### Oracle Database Preinstall이 해주는 역할

- **사용자 및 그룹 생성**: oracle 사용자, oinstall, dba 그룹 생성
- **필수 패키지 설치**: Oracle Database 설치 및 운영에 필요한 여러 필수 패키지 설치
  - gcc, glibc, libaio, compat-libstdc++ 등
- **커널 매개변수 설정**: /etc/sysctl.conf 설정

### Preinstall 패키지 설치

Oracle Preinstall에 필요한 의존 라이브러리 설치도 해주고 Oracle Preinstall도 설치해줍니다.

```bash
[root@CentOS7-5 ~]# yum install -y https://yum.oracle.com/repo/OracleLinux/OL7/latest/x86_64/getPackage/oracle-database-preinstall-19c-1.0-1.el7.x86_64.rpm
```

## 2. 디렉토리 생성, bash_profile 수정, hosts 수정

### 디렉토리 생성 및 권한 설정

```bash
[root@CentOS7-5 ~]# mkdir -p /app/ora19c/19c
[root@CentOS7-5 ~]# mkdir -p /app/oraInventory
[root@CentOS7-5 ~]# chown -R oracle:dba /app/
[root@CentOS7-5 ~]# su - oracle
```

### oracle 계정 .bash_profile 수정

```bash
[oracle@CentOS7-5 ~]# vi .bash_profile
```

```bash
# .bash_profile

# Get the aliases and functions
if [ -f ~/.bashrc ]; then
        . ~/.bashrc
fi

# User specific environment and startup programs

PATH=$PATH:$HOME/.local/bin:$HOME/bin

export PATH

# oracle setup
export ORACLE_OWNER=oracle
export ORACLE_BASE=/app/ora19c
export ORACLE_HOME=/app/ora19c/19c
export TNS_ADMIN=$ORACLE_HOME/network/admin
export ORACLE_SID=hmtest
export NLS_LANG=AMERICAN_AMERICA.AL32UTF8
export ORACLE_HOSTNAME=hm_test
export TMP=/tmp
export TMPDIR=$TMP
export PATH=$PATH:$ORACLE_HOME/bin:$ORACLE_HOME:/usr/bin:
export DISPLAY=192.168.56.1:0.0
export LANG=C
```

```bash
[oracle@CentOS7-5 ~]# source .bash_profile
```

### hosts 파일 변경

```bash
[root@CentOS7-5 ~]# vi /etc/hosts
```

```
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6

192.168.56.20 hm_test
```

```bash
[root@CentOS7-5 ~]# vi /etc/hostname
```

```
hm_test
```

### 시스템 재부팅

```bash
[root@CentOS7-5 ~]# reboot
```

## 3. Oracle 설치

### Oracle 19c 다운로드

아래 사이트에서 Oracle 19c zip 파일을 다운로드합니다.
- **파일명**: LINUX.X64_193000_db_home.zip
- **다운로드 URL**: https://www.oracle.com/kr/database/technologies/oracle19c-linux-downloads.html

설치 후, MobaXterm 같은 툴로 테스트 서버에 옮깁니다.

### 파일 설치 및 압축 해제

```bash
# 파일 옮기기
[root@hm_test 19c]# mv LINUX.X64_193000_db_home.zip /app/ora19c/19c/
[root@hm_test 19c]# cd /app/ora19c/19c/

# 파일 압축 해제
[root@hm_test 19c]# unzip LINUX.X64_193000_db_home.zip

# 파일 권한 부여
[root@hm_test 19c]# chown -R oracle:dba /app

# 사용자 변경
[root@hm_test 19c]# su - oracle

# runInstaller 실행
[oracle@hm_test ora19c]$ cd /app/ora19c/19c/
[oracle@hm_test 19c]$ ./runInstaller
```
![보안 업데이트 설정](/assets/Image/ora19cinstall/1.png)

![보안 업데이트 설정](/assets/Image/ora19cinstall/2.png)

![보안 업데이트 설정](/assets/Image/ora19cinstall/3.png)

![보안 업데이트 설정](/assets/Image/ora19cinstall/4.png)

### 설치 시 주의사항

> **참고**: Swap 쪽은 ignore 하고 지나가도 되는데, 패키지 의존성에서 걸리면 안됩니다. 따라서 세션 하나를 더 띄워서 관련 패키지 설치하고 "Check Again" 버튼을 눌러서 해결한 후, Next 합니다.

![보안 업데이트 설정](/assets/Image/ora19cinstall/5.png)

![보안 업데이트 설정](/assets/Image/ora19cinstall/6.png)

## 4. Database Configuration Assistant

Oracle 엔진 설치를 끝냈으니 Database를 설치해봅시다.

```bash
[oracle@hm_test 19c]$ dbca
```

![보안 업데이트 설정](/assets/Image/ora19cinstall/7.png)

![보안 업데이트 설정](/assets/Image/ora19cinstall/8.png)

![보안 업데이트 설정](/assets/Image/ora19cinstall/9.png)

![보안 업데이트 설정](/assets/Image/ora19cinstall/10.png)

![보안 업데이트 설정](/assets/Image/ora19cinstall/11.png)

![보안 업데이트 설정](/assets/Image/ora19cinstall/12.png)

![보안 업데이트 설정](/assets/Image/ora19cinstall/13.png)


## 5. 19c 작동 테스트

### SQL*Plus 접속 테스트

```bash
[oracle@hm_test 19c]$ sqlplus hmtest/hmtest as sysdba
```

```
SQL*Plus: Release 19.0.0.0.0 - Production on Thu Jul 18 09:46:48 2024
Version 19.3.0.0.0

Copyright (c) 1982, 2019, Oracle.  All rights reserved.

Connected to:
Oracle Database 19c Enterprise Edition Release 19.0.0.0.0 - Production
Version 19.3.0.0.0

SQL> select instance_name,status from v$instance;

INSTANCE_NAME    STATUS
---------------- ------------
hmtest           OPEN
```

### TNS 연결 테스트

```bash
[oracle@hm_test 19c]$ tnsping hmtest
```

```
TNS Ping Utility for Linux: Version 19.0.0.0.0 - Production on 18-JUL-2024 09:47:12

Copyright (c) 1997, 2019, Oracle.  All rights reserved.

Used parameter files:
/app/ora19c/19c/network/admin/sqlnet.ora

Used TNSNAMES adapter to resolve the alias
Attempting to contact (DESCRIPTION = (ADDRESS = (PROTOCOL = TCP)(HOST = hm_test)(PORT = 1521)) (CONNECT_DATA = (SERVER = DEDICATED) (SERVICE_NAME = hmtest)))
OK (0 msec)
```

## 설치 완료

Oracle 19c 설치가 성공적으로 완료되었습니다. 인스턴스가 정상적으로 OPEN 상태이며, TNS 연결도 정상적으로 작동하고 있습니다.
