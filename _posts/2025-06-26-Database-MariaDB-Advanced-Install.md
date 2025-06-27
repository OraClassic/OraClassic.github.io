---
title: "Advanced Install MariaDB"
date: 2025-06-26
categories: ["Categories","Database", "MariaDB", "Install"]
taxonomy: MariaDB_Install
---

> **Advanced Install MariaDB에서는 세부적인 my.cnf 설정을 통해 설치를 진행하며, 기존 MySQL/MariaDB 패키지 제거, SELINUX/방화벽 설정, 커스텀 디렉토리 구성 등을 포함합니다.**

---

## 1. 사전 준비 작업

### 1-1. 기존 MySQL/MariaDB 패키지 확인 및 제거
VM으로 리눅스 서버를 구축할 때, 해당 패키지까지 깔리면서 구축될 수 있기 때문에 반드시 확인하고 제거해야 합니다.

```bash
# 기존 MySQL 패키지 확인
[root@ic-server1 yum.repos.d]# yum list installed | grep -i mysql

# 기존 MariaDB 패키지 확인
[root@ic-server1 yum.repos.d]# yum list installed | grep -i maria

# 만약 설치된 패키지가 있다면 rm 명령어로 반드시 삭제
```

### 1-2. SELINUX 및 방화벽 설정
**SELINUX 비활성화:**
- MySQL의 기본 경로를 사용하지 않으면 SELINUX가 발동하여 서버 실행이 안됨

```bash
[root@ic-server1 ~]# vi /etc/selinux/config
# SELINUX=disabled로 변경
SELINUX=disabled
```

**방화벽 비활성화:**
- Replication에서 문제가 발생함
- 방화벽을 끄거나 이중화 포트를 열어주어야 함

```bash
[root@ic-server1 ~]# systemctl disable firewalld
[root@ic-server1 ~]# reboot
```

---

## 2. MariaDB Repository 등록

### 2-1. Repository 파일 생성
```bash
[root@ic-server1 yum.repos.d]# vi /etc/yum.repos.d/MariaDB.repo
```

### 2-2. Repository 설정 내용
```ini
[mariadb]
name = MariaDB
baseurl = http://yum.mariadb.org/10.5/centos7-amd64
gpgkey = https://yum.mariadb.org/RPM-GPG-KEY-MariaDB
gpgcheck = 1
```

---

## 3. MariaDB 설치 및 기본 설정

### 3-1. MariaDB 패키지 설치
```bash
[root@ic-server1 yum.repos.d]# yum install -y MariaDB MariaDB-server MariaDB-client MariaDB-devel
```

### 3-2. my.cnf 파일 복사
```bash
[root@ic-server1 yum.repos.d]# cp /etc/my.cnf.d/server.cnf /etc/my.cnf
```

---

## 4. 커스텀 디렉토리 구성

### 4-1. 데이터 및 임시 디렉토리 생성
```bash
# 데이터 디렉토리, 템프 디렉토리 생성
[root@ic-server1 /]# mkdir -p /DATA/DATA
[root@ic-server1 /]# mkdir -p /DATA/tmpdir
```

### 4-2. 로그 디렉토리 생성
```bash
# 슬로우 쿼리 & 에러 로그, 바이너리 디렉토리 생성
[root@ic-server1 /]# mkdir -p /DATA/LOG/etc_log
[root@ic-server1 /]# mkdir -p /DATA/LOG/binary_log
```

### 4-3. 소유권 변경
```bash
# /DATA 디렉토리 소유권 변경
[root@ic-server1 /]# chown -R mysql:mysql /DATA
```

---

## 5. my.cnf 설정

### 5-1. my.cnf 파일 편집
```bash
[root@ic-server1 mysql]# vi /etc/my.cnf
```

### 5-2. 상급 노하우가 겸비된 my.cnf 설정
**참고:** 아래 블로그의 my.cnf 설정을 참고하여 설정
- datadir, socket 경로가 /var/lib/mysql이 아니라는 점만 주의
- 상세한 설정은 [밀레니엄 DB 기술집 블로그](https://blog.naver.com/ricky63/223531366389) 참고

---

## 6. 데이터베이스 초기화

### 6-1. mysql_install_db 실행
데이터 디렉토리의 위치가 default가 아니므로, mysql_install_db 명령어를 통해 명시적으로 user, basedir, datadir를 지정해야 합니다.

```bash
[root@ic-server1 DATA]# mysql_install_db --user=mysql --basedir=/usr --datadir=/DATA/DATA
```

**중요:** mysql_install_db 명령어를 실행하지 않고 바로 start mysqld를 하면 아래와 같은 에러가 발생합니다:
```
[ERROR] Can't open and lock privilege tables: Table 'mysql.servers' doesn't exist
[ERROR] Fatal error: Can't open and lock privilege tables: Table 'mysql.db' doesn't exist
```

**설정 설명:**
- `--user=mysql`: MySQL 사용자 지정
- `--basedir=/usr`: MySQL 실행 명령어의 base 경로 (which mysql 실행 시 /usr/bin/mysql이 나온다면 --basedir=/usr)
- `--datadir=/DATA/DATA`: 데이터 디렉토리 경로

---

## 7. MariaDB 서비스 시작 및 초기 설정

### 7-1. MariaDB 서비스 시작
```bash
[root@ic-server1 yum.repos.d]# systemctl start mysqld
```

### 7-2. MariaDB 접속 및 비밀번호 변경
```bash
[root@ic-server1 ~]# mysql -uroot
```

**MariaDB 접속 후 비밀번호 변경:**
```sql
mysql> alter user root@localhost identified by 'Qkqkaqk123@';
```

**참고:** MariaDB는 일회성 비밀번호가 없습니다.

### 7-3. Socket 심볼릭 링크 생성
```bash
[root@ic-server1 DATA]# ln -s /tmp/mysql.sock /var/lib/mysql/mysql.sock
```

---

## 8. 보안 강화 설정

### 8-1. mysql_secure_installation 실행
이 프로그램을 사용하면 MySQL 설치의 보안을 강화할 수 있습니다.

```bash
[root@ic-server1 yum.repos.d]# mysql_secure_installation
```

### 8-2. 보안 설정 옵션
```bash
[root@ic-server1 ~]# mysql_secure_installation

Enter password for user root: 
# 위에서 설정한 root 비밀번호 입력

Switch to unix_socket authentication [Y/n]: n
# 유닉스 소켓 인증 방식으로 전환할 것입니까? (OS의 사용자와 MariaDB의 사용자가 동일시 되는 기능)

Change the password for root ? ((Press y|Y for Yes, any other key for No) : n
# root 계정을 바꾸시겠습니까?

Remove anonymous users? (Press y|Y for Yes, any other key for No) : y
# 익명의 사용자를 제거할 것입니까?

Disallow root login remotely? (Press y|Y for Yes, any other key for No) : y
# 원격으로 root의 mysql 접속을 허용하지 않을 것입니까?

Remove test database and access to it? (Press y|Y for Yes, any other key for No) : y
# Test 데이터베이스를 삭제할 것입니까?

Reload privilege tables now? (Press y|Y for Yes, any other key for No) : y
# 권한 테이블을 reload 할 것입니까?
```

---

## 9. 보안 강화 기능 설명

### 9-1. mysql_secure_installation의 기능
- root 계정에 비밀번호 설정
- 로컬 호스트 외부에서 접근할 수 있는 계정 제거
- 익명 사용자 계정 제거
- test 데이터베이스와 이름이 '.' 으로 시작하는 데이터베이스에 누구나 접근할 수 있는 권한 제거

### 9-2. 권장 설정
- **익명 사용자 제거**: 보안상 권장
- **원격 root 접속 차단**: 보안상 권장
- **test 데이터베이스 제거**: 보안상 권장
- **권한 테이블 reload**: 설정 적용을 위해 필수

---

## 10. 설치 완료 확인

### 10-1. 서비스 상태 확인
```bash
# MariaDB 서비스 상태 확인
systemctl status mysqld

# 서비스 자동 시작 설정
systemctl enable mysqld
```

### 10-2. 접속 테스트
```bash
# root 계정으로 접속 테스트
mysql -uroot -p
```

### 10-3. 데이터베이스 확인
```sql
-- 데이터베이스 목록 확인
SHOW DATABASES;

-- 사용자 목록 확인
SELECT user, host FROM mysql.user;
```

---

## 11. 추가 설정 권장사항

### 11-1. 백업 설정
```bash
# 백업 디렉토리 생성
mkdir -p /DATA/BACKUP
chown -R mysql:mysql /DATA/BACKUP
```

### 11-2. 모니터링 설정
```bash
# 로그 로테이션 설정
vi /etc/logrotate.d/mysql
```

### 11-3. 성능 튜닝
- my.cnf 파일에서 메모리 설정 최적화
- InnoDB 버퍼 풀 크기 조정
- 쿼리 캐시 설정

---

> Advanced Install MariaDB는 기본 설치보다 더 세밀한 제어가 가능하며, 프로덕션 환경에 적합한 설정을 제공합니다. 