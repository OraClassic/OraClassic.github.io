---
title: "Simple Install MySQL 8.0.25"
date: 2025-06-26
categories: ["Categories","Database", "MySQL", "Install"]
taxonomy: MySQL_Install
---

> **MySQL은 YUM, RPM, MAKE(소스) 방식으로 설치할 수 있으며, 실무에서는 주로 RPM 번들 파일을 이용한 설치가 많이 사용됩니다.**

---

## 1. MySQL 설치 방식 개요

- **YUM 리포지토리 설치**: mysql 리포지토리 경로 설정 후 yum install mysql만 하면 됨
- **RPM 설치**: 번들 파일을 받아서 의존성 순서대로 설치 (실무에서 가장 많이 사용)
- **MAKE 설치**: 소스 빌드, 버전 리빌딩 등 특수 목적

이 문서에서는 **RPM 번들 파일**을 이용한 MySQL 8.0.25 설치 방법을 다룹니다.

---

## 2. MySQL RPM 번들 파일 다운로드

아래 사이트에서 운영체제, 비트, 버전을 맞춰서 데이터 사이즈가 가장 큰 'Bundle' 파일로 다운로드합니다.

- [MySQL Community Server (Archived Versions)](https://downloads.mysql.com/archives/community/)

다운로드한 파일을 서버로 전송(MobaXterm 등 활용)합니다.

---

## 3. 파일 경로 생성 및 압축 해제

```bash
[root@ic-server1 /]# mkdir -p /download
[root@ic-server1 download]# mv /root/mysql-8.0.25-1.el7.x86_64.rpm-bundle.tar /download/
[root@ic-server1 download]# tar -xvf mysql-8.0.25-1.el7.x86_64.rpm-bundle.tar
```

---

## 4. 의존성에 맞게 RPM 파일 설치

아래 순서대로 설치해야 의존성 에러가 발생하지 않습니다.

```bash
[root@ic-server1 download]# rpm -ivh mysql-community-common-8.0.25-1.el7.x86_64.rpm
[root@ic-server1 download]# rpm -ivh mysql-community-client-plugins-8.0.25-1.el7.x86_64.rpm
[root@ic-server1 download]# rpm -ivh mysql-community-libs-8.0.25-1.el7.x86_64.rpm
[root@ic-server1 download]# rpm -ivh mysql-community-libs-compat-8.0.25-1.el7.x86_64.rpm
[root@ic-server1 download]# rpm -ivh mysql-community-embedded-compat-8.0.25-1.el7.x86_64.rpm
[root@ic-server1 download]# rpm -ivh mysql-community-devel-8.0.25-1.el7.x86_64.rpm
[root@ic-server1 download]# rpm -ivh mysql-community-client-8.0.25-1.el7.x86_64.rpm
[root@ic-server1 download]# rpm -ivh mysql-community-server-8.0.25-1.el7.x86_64.rpm
```

### 4-1. 의존성 에러 해결

- **mariadb-libs is obsoleted**
  - 에러: mariadb-libs와 충돌
  - 해결: `yum remove mariadb-libs` 후 재설치

- **pkgconfig(openssl) is needed**
  - 에러: openssl 미설치
  - 해결: `yum install openssl*` 후 재설치

- **net-tools is needed**
  - 에러: net-tools 미설치
  - 해결: `yum install net-tools` 후 재설치

---

## 5. MySQL 서비스 시작 및 상태 확인

```bash
[root@ic-server1 download]# systemctl start mysqld
[root@ic-server1 download]# systemctl status mysqld
```

- `Active: active (running)` 상태가 나오면 정상적으로 기동된 것

---

## 6. 일회성 비밀번호 확인 및 접속

MySQL은 설치 후 root 계정에 일회성 비밀번호가 부여됩니다. 해당 비밀번호를 확인해야 합니다.

```bash
[root@ic-server1 download]# cat /var/log/mysqld.log | grep -i "temporary"
# 예시 출력:
# 2024-07-16T23:26:59.344363Z 6 [Note] [MY-010454] [Server] A temporary password is generated for root@localhost: <78vW-hOeicQ
```

해당 비밀번호로 접속:
```bash
[root@ic-server1 download]# mysql -uroot -p"<78vW-hOeicQ>"
```

---

## 7. 비밀번호 변경 및 계정 생성

비밀번호를 변경하지 않으면 아무 작업도 할 수 없습니다.

```sql
mysql> alter user root@localhost identified by 'Qkqkaqk123@';
```

비밀번호 변경 후 정상적으로 접속되는지 확인:
```bash
[root@ic-server1 download]# mysql -uroot -pQkqkaqk123@
```

계정 생성 예시:
```sql
mysql> create user hm_test@'%' identified by 'hm_test';
mysql> create user hm_test@'%' identified by 'Qkqkaqkhmtest123@';
```

---

## 8. 설치 확인 및 마무리

### 8-1. MySQL 버전 확인
```sql
mysql> select version();
```

### 8-2. 서비스 자동 시작 설정
```bash
systemctl enable mysqld
```

### 8-3. 데이터베이스/사용자 확인
```sql
mysql> show databases;
mysql> select user, host from mysql.user;
```

---

> Simple Install MySQL 8.0.25 (RPM 방식)은 실무에서 가장 많이 사용되는 설치 방식으로, 의존성 에러만 잘 처리하면 빠르고 안정적으로 설치할 수 있습니다. 