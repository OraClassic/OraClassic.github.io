---
title: "Oracle Flashback 복구 매뉴얼 1편"
date: 2025-06-17
categories: ["Categories","Database", "Oracle", "Backup_restore"]
taxonomy: Backup_restore
---

> **Row Level Flashback은 사용자의 논리적 실수(테이블 삭제, DML 오류 등)를 빠르게 복구할 수 있는 강력한 기능입니다. 단, 물리적 장애에는 사용할 수 없습니다.**

---

## 1. Flashback 모드 설정 및 에러 해결

### 1-1. Flashback 모드 변경
```sql
SQL> shutdown immediate;
SQL> startup mount;
SQL> alter database archivelog;
SQL> !mkdir -p /app/ora19c/19c/dbs/arch
SQL> alter database flashback on;
```

- 만약 아래와 같은 에러가 발생한다면:

```
ORA-38706: Cannot turn on FLASHBACK DATABASE logging.
ORA-38709: Recovery Area is not enabled.
```

### 1-2. ORA-38706, ORA-38709 에러 해결법

1. 아카이브 & FRA 디렉토리 생성 (root로 실행)
```bash
mkdir -p /FRA
chown -R oracle.dba /FRA
```
2. FRA 파라미터 변경 (동적 파라미터 사용 시)
```sql
ALTER SYSTEM SET DB_RECOVERY_FILE_DEST_SIZE=20G scope=spfile;
ALTER SYSTEM SET DB_RECOVERY_FILE_DEST='/FRA' scope=spfile;
SQL> ALTER DATABASE FLASHBACK ON;
```
3. FRA 파라미터 변경 (정적 파라미터 사용 시)
```bash
vi /app/ora19c/19c/dbs/initspectra.ora
# 아래 내용 추가
DB_RECOVERY_FILE_DEST_SIZE=20G
DB_RECOVERY_FILE_DEST='/FRA'
SQL> shutdown immediate
SQL> startup mount
SQL> ALTER DATABASE FLASHBACK ON;
```

### 1-3. Flashback 모드 확인 및 DB OPEN
```sql
SQL> SELECT FLASHBACK_ON FROM V$DATABASE;
-- YES로 나오면 정상
SQL> alter database open;
```

### 1-4. RVWR 프로세스 실행 확인
```bash
ps -efl | grep [r]vwr
```

---

## 2. 테스트 데이터 준비

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

## 3. 실수로 인한 데이터 변경 및 Flashback 복구

### 3-1. 실수로 데이터 변경
```sql
SQL> update hm_test.test set name = 'error999' where name ='test5';
SQL> select * from hm_test.test;
-- 결과: test, test2, test3, error999
SQL> commit;
```

### 3-2. Flashback Version Query로 변경 이력 조회
```sql
select versions_startscn st_scn, versions_endscn endscn, versions_xid txid, versions_operation opt, name from hm_test.test versions between scn minvalue and maxvalue;
```

- 쿼리 결과에서 SCN과 변경 이력을 확인하여 복구할 수 있음

### 3-3. 데이터 복구 (update)
```sql
SQL> update hm_test.test set name ='test5' where name ='error999';
SQL> select * from hm_test.test;
-- 결과: test, test2, test3, test5
```

---

> Flashback 기능은 undo segment가 충분히 남아있을 때만 복구가 가능합니다. 너무 많은 트랜잭션이 일어나면 복구가 불가능할 수 있으니 주의하세요. 

> DB Link를 활용한 복구 및 추가적인 활용법은 별도 포스트에서 다룹니다. 
- Table Level Flashback 링크: [Oracle Flashback 복구 매뉴얼 2편](/categories/database/oracle/backup_restore/Database-Oracle-Flashback-Recovery-2/) 참고
- Database Level Flashback 링크: [Oracle Flashback 복구 매뉴얼 3편](/categories/database/oracle/backup_restore/Database-Oracle-Flashback-Recovery-3/) 참고