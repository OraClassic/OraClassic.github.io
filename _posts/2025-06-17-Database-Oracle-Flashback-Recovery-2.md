---
title: "Oracle Flashback 복구 매뉴얼 2편"
date: 2025-06-17
categories: ["Categories","Database", "Oracle", "Backup_restore"]
taxonomy: Backup_restore
---

> **Table Level Flashback은 테이블 전체를 장애 발생 전 상태로 복구하는 기술로, Row Level Flashback과 달리 테이블 전체의 내용이 변경됩니다.**

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

## 3. SCN과 TIMESTAMP 확인
```sql
SQL> select current_scn from v$database;
SQL> select systimestamp from v$database;
```

---

## 4. 실수로 인한 데이터 변경
```sql
SQL> update hm_test.test set name = 'error999' where name ='test5';
SQL> select * from hm_test.test;
-- 결과: test, test2, test3, error999
SQL> commit;
```

---

## 5. Table Level Flashback 복구

### 5-1. SCN 방식
```sql
SQL> flashback table hm_test.test to scn '1270797';
-- 만약 ORA-08189 에러 발생 시:
SQL> alter table hm_test.test enable row movement;
-- 다시 flashback table 명령 실행
SQL> select * from hm_test.test;
-- 결과: test, test2, test3, test5
```

- SCN 번호를 모르면 Flashback Version Query로 SCN을 확인해야 함
- 자세한 내용은 [Oracle Flashback 복구 매뉴얼 1편](/2025-06-17-Database-Oracle-Flashback-Recovery-1/) 참고

### 5-2. Timestamp 방식
```sql
SQL> select systimestamp from dual;
-- 장애 발생 시간과 현재 시간 차이 계산 후, 아래처럼 입력
SQL> flashback table hm_test.test to timestamp(systimestamp - interval '8' minute);
SQL> select * from hm_test.test;
-- 결과: test, test2, test3, test5
```

---

## 6. DROP TABLE 복구 (Recyclebin)

### 6-1. 테이블 삭제 및 확인
```sql
SQL> drop table hm_test.test;
SQL> select * from hm_test.test;
-- ORA-00942: table or view does not exist
```

### 6-2. Recyclebin에서 테이블 확인
```sql
SQL> show recyclebin;
-- BIN$~~ 이름이 나오면 복구 가능
```

### 6-3. 테이블 되살리기
```sql
SQL> flashback table TEST to before drop;
SQL> select * from hm_test.test;
-- 결과: test, test2, test3, test5
```
- 인덱스는 따로 복구 필요: `alter index '인덱스명' rename to '기존_idx_name';`
- 테이블명 바꿔서 복구: `flashback table '테이블명' to before drop rename to 'TOBE_테이블명';`

---

> Table Level Flashback은 drop 장애 복구에는 강력하지만, truncate 장애는 Database Level Flashback이 필요합니다. 