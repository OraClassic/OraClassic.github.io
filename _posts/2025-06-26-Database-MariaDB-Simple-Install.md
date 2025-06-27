---
title: "Simple Install MariaDB 10.5"
date: 2025-06-26
categories: ["Categories","Database", "MariaDB", "Install"]
taxonomy: MariaDB_Install
---

> **MariaDB는 YUM(온라인) 방식으로 간단하게 설치할 수 있으며, 특정 버전 설치를 위해 리포지토리 설정을 커스터마이징할 수 있습니다.**

---

## 1. MariaDB Repository 파일 생성 및 설정

MariaDB를 YUM으로 설치할 때, 기본적으로 최신 버전이 설치됩니다. 특정 버전을 설치하고 싶다면 리포지토리 파일을 직접 만들어 baseurl을 원하는 버전으로 지정해야 합니다.

```bash
[root@localhost ~]# vi /etc/yum.repos.d/MariaDB.repo
```

**예시(MariaDB 10.4 버전):**
```ini
[mariadb]
name = MariaDB
baseurl = https://rpm.mariadb.org/10.4/centos/$releasever/$basearch
module_hotfixes = 1
gpgkey = https://rpm.mariadb.org/RPM-GPG-KEY-MariaDB
gpgcheck = 1
```

- 원하는 버전으로 설치하려면 baseurl의 버전 숫자(10.4 등)를 변경하면 됩니다.

---

## 2. YUM으로 MariaDB 설치

```bash
[root@localhost ~]# yum install -y MariaDB MariaDB-server MariaDB-client MariaDB-devel
```

- 인터넷이 연결되어 있어야 하며, 의존성 패키지도 자동으로 설치됩니다.

---

## 3. my.cnf 파일 복사

MariaDB는 설치 시 여러 설정 파일이 `/etc/my.cnf.d/`에 분리되어 있습니다. 기본 설정을 `/etc/my.cnf`로 복사해 사용합니다.

```bash
[root@ic-server1 my.cnf.d]# cp /etc/my.cnf.d/server.cnf /etc/my.cnf
```

---

## 4. MariaDB 서비스 시작

MariaDB 서버를 시작합니다.

```bash
[root@ic-server1 yum.repos.d]# systemctl start mariadb
```

- 서비스가 정상적으로 시작되었는지 확인하려면:
```bash
systemctl status mariadb
```

---

## 5. MariaDB 접속 및 버전 확인

MariaDB에 root 계정으로 접속합니다.

```bash
[root@ic-server1 yum.repos.d]# mysql -uroot
```

정상적으로 접속되면 아래와 같은 화면이 나옵니다:
```
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MariaDB connection id is 3
Server version: 10.5.25-MariaDB MariaDB Server
...
MariaDB [(none)]> select version();
+-----------------+
| version()       |
+-----------------+
| 10.5.25-MariaDB |
+-----------------+
1 row in set (0.000 sec)
```

---

## 6. 추가 설정 (비밀번호 변경 등)

MariaDB 10.5는 설치 직후 root 계정에 비밀번호가 설정되어 있지 않을 수 있습니다. 필요하다면 비밀번호를 변경하세요.

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY '새로운비밀번호';
```

또는, 보안 설정을 위해 아래 명령어를 실행할 수 있습니다:

```bash
mysql_secure_installation
```

- root 비밀번호 설정
- 익명 사용자 제거
- 원격 root 접속 차단
- test DB 삭제 등

---

## 7. 서비스 자동 시작 설정

서버 재부팅 시 MariaDB가 자동으로 시작되도록 설정합니다.

```bash
systemctl enable mariadb
```

---

## 8. 설치 확인 및 마무리

### 8-1. MariaDB 서비스 상태 확인
```bash
systemctl status mariadb
```

### 8-2. 데이터베이스 목록 확인
```sql
SHOW DATABASES;
```

### 8-3. 사용자 목록 확인
```sql
SELECT user, host FROM mysql.user;
```

---

> Simple Install MariaDB 10.5는 YUM(온라인) 방식으로 빠르고 쉽게 설치할 수 있으며, 리포지토리 설정을 통해 원하는 버전으로 설치가 가능합니다. 