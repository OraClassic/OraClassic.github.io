---
title: "Oracle Clone DB를 활용한 시점 복구 매뉴얼"
date: 2025-06-16
categories: ["Categories","Database", "Oracle", "Backup_restore"]
taxonomy: Backup_restore
---

> **DB 전체에 영향을 주는 트랜잭션 장애 발생 시, Clone DB를 생성하여 특정 시점으로 복구하는 방법을 안내합니다.**

---

## 1. 개요 및 상황 설명

- 소수 테이블 트랜잭션 문제: LogMiner로 복구 가능
- DB 전체 장애/대규모 트랜잭션 문제: LogMiner로 일일이 복구 불가 → 특정 시점으로 롤백 필요
- 운영 상태 유지하며 복구 요청 시: Clone DB 생성 + DB Link 활용
- Hot, Cold Backup 파일이 반드시 존재해야 함 (없으면 아카이브 로그로 복구, 둘 다 없으면 복구 불가)

---

## 2. 원본 데이터 및 환경 준비

### 2-1. 원본 데이터 확인
```sql
SQL> select * from hm_test.test;
```

### 2-2. 원본 데이터가 없을 경우 DDL, DML 예시
```sql
SQL> create user hm_test identified by hm_test;
SQL> grant all privileges to hm_test;
SQL> create table hm_test.test (name varchar(10));
SQL> insert into hm_test.test values ('test');
SQL> insert into hm_test.test values ('test2');
SQL> insert into hm_test.test values ('test3');
SQL> insert into hm_test.test values ('test5');
SQL> select * from hm_test.test;
```

---

## 3. Hot Backup 및 아카이브 로그 생성

### 3-1. Hot Backup 진행 (어떤 백업이든 상관 없음)
> Hot Backup 매뉴얼 참고: [Oracle Hot Backup 매뉴얼](/categories/database/oracle/backup_restore/Database-Oracle-HotBackup/)

### 3-2. 아카이브 로그 발생
```sql
SQL> alter system switch logfile;
SQL> alter system switch logfile;
SQL> alter system switch logfile;
```

---

## 4. 장애 발생 및 데이터 손실 상황

```sql
SQL> drop table hm_test.test;
SQL> select * from hm_test.test;
-- ORA-00942: table or view does not exist
```

---

## 5. Clone DB 생성 및 복구 절차

### 5-1. pfile 파라미터 파일 복제 및 백업 파일 재백업
```bash
cp /app/ora19c/19c/dbs/initORCL.ora /app/ora19c/19c/dbs/initclone1.ora
vi /app/ora19c/19c/dbs/initCLONE1.ora
# control_files, db_name 등 경로/시드네임 변경
*.control_files='/app/backup/control01.ctl','/app/backup/control02.ctl'
*.db_name='CLONE1'
```
> 동적 파라미터(spfile) 사용 시: `create pfile from spfile;`로 정적 파라미터 생성
> 복구 실패 대비 백업 파일 재백업 필수

### 5-2. control 트레이스 파일 생성
```sql
SQL> alter database backup controlfile to trace as '/app/backup/ctl_clone.sql';
```

- ctl_clone.sql에서 "Set #2. RESETLOGS case" 구문만 남기고, "SET #1. NORESETLOGS case" 부분은 삭제/주석처리

#### 예시 (RESETLOGS case)
```sql
STARTUP NOMOUNT
CREATE CONTROLFILE SET DATABASE "CLONE1" RESETLOGS ARCHIVELOG
    MAXLOGFILES 16
    MAXLOGMEMBERS 3
    MAXDATAFILES 100
    MAXINSTANCES 8
    MAXLOGHISTORY 292
LOGFILE
  GROUP 1 '/app/backup/redo01.log'  SIZE 200M BLOCKSIZE 512,
  GROUP 2 '/app/backup/redo02.log'  SIZE 200M BLOCKSIZE 512,
  GROUP 3 '/app/backup/redo03.log'  SIZE 200M BLOCKSIZE 512
DATAFILE
  '/app/backup/system01.dbf',
  '/app/backup/sysaux01.dbf',
  '/app/backup/undotbs01.dbf',
  '/app/backup/users01.dbf'
CHARACTER SET AL32UTF8;
```

---

## 6. Clone DB 기동 및 복구

### 6-1. SID 변경 및 Oracle 실행
```bash
export ORACLE_SID=CLONE1
sqlplus / as sysdba
SQL> @/app/backup/ctl_clone.sql
```
> ctl_clone.sql 실행 시, 컨트롤 파일 생성 후 SCN 불일치로 MOUNT 상태가 됨

### 6-2. 복구 진행
```sql
SQL> RECOVER DATABASE USING BACKUP CONTROLFILE UNTIL CANCEL;
# 로그파일 경로 입력 또는 cancel 입력
SQL> ALTER DATABASE OPEN RESETLOGS;
```

### 6-3. 데이터 확인
```sql
SQL> select * from hm_test.test;
```

---

> DB Link를 활용한 복구 및 추가적인 활용법은 별도 포스트에서 다룹니다. 