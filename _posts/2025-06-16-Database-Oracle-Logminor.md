---
title: "Oracle LogMiner 사용 매뉴얼"
date: 2025-06-16
categories: ["Categories","Database", "Oracle", "Backup_restore"]
taxonomy: Backup_restore
---

> **LogMiner는 오라클 아카이브 로그를 분석해 실수로 변경된 데이터를 복구할 때 사용하는 강력한 도구입니다.**

---

## 1. 테스트 전 사전 작업

### 1-1. 로그 마이너 설치 확인
```sql
SQL> desc dbms_logmnr
```
- 만약 logmnr이 없으면 아래 명령어 실행
```sql
SQL> @/app/ora19c/19c/rdbms/admin/dbmslm.sql
```

### 1-2. supplemental 로그 설정 확인
```sql
SQL> select supplemental_log_data_min from v$database;
-- NO라면 아래 명령어로 활성화
SQL> alter database add supplemental log data;
SQL> select supplemental_log_data_min from v$database;
-- YES로 변경됨
```

### 1-3. 오라클 archive log 상태 확인 및 활성화
```sql
SQL> archive log list;
-- No Archive Mode라면 아래처럼 변경
SQL> shutdown immediate;
SQL> startup mount;
SQL> alter database archivelog;
SQL> alter database open;
SQL> archive log list;
-- Archive Mode로 변경됨
```

### 1-4. Archive log 디렉토리 생성
```bash
[oracle@oraser01 dbs]$ mkdir -p /app/ora19c/19c/dbs/arch
```

---

## 2. LogMiner 실습 예시

### 2-1. 테스트 테이블 생성 및 데이터 입력
```sql
SQL> create table hm_test.test (name varchar(10));
SQL> insert into hm_test.test values ('test');
SQL> insert into hm_test.test values ('test2');
SQL> insert into hm_test.test values ('test3');
SQL> insert into hm_test.test values ('test5');
SQL> select * from hm_test.test;
```

### 2-2. LogMiner 디렉토리 생성
```bash
[oracle@oraser01 admin]$ mkdir -p /app/logmnr
```

### 2-3. 상황 설명
- 사용자가 실수로 데이터를 변경하여 복구가 필요한 상황
- 예시: 'test99', 'test2', 'test5'로 변경됨

### 2-4. Oracle 디렉토리 및 딕셔너리 파일 생성
```sql
SQL> create directory dict as '/app/logmnr';
BEGIN
   SYS.DBMS_LOGMNR_D.build (
      dictionary_filename => 'logmnrdict.ora',
      dictionary_location => 'DICT');
END;
/
-- 생성 확인
SQL> !ls /app/logmnr
logmnrdict.ora
```

### 2-5. 분석할 로그 파일 추가
```sql
SQL> exec dbms_logmnr.add_logfile('/app/oradata/ORCL/redo01.log',1);
SQL> exec dbms_logmnr.add_logfile('/app/oradata/ORCL/redo02.log',3);
SQL> exec dbms_logmnr.add_logfile('/app/oradata/ORCL/redo03.log',3);
```

### 2-6. 등록 log 파일 분석 시작
```sql
SQL> exec dbms_logmnr.start_logmnr(dictfilename=>'/app/logmnr/logmnrdict.ora');
```

### 2-7. 분석 결과 조회 및 복구
```sql
SQL> CREATE TABLE hm_test.logmnr_table AS
SELECT TO_CHAR(timestamp, 'YYYY-MM-DD:HH24:MI:SS') AS formatted_timestamp,
       seg_owner,
       username,
       sql_redo,
       sql_undo
FROM v$logmnr_contents
WHERE seg_owner = 'HM_TEST';
```

문제를 일으킨 sql_redo를 찾아서 sql_undo를 실행해 복구합니다.

```sql
SQL> update "HM_TEST"."TEST" set "NAME" = 'test' where "NAME" = 'test99' ;
SQL> insert into "HM_TEST"."TEST"("NAME") values ('test3');
SQL> select * from hm_test.test;
```

---

> LogMiner를 활용하면 아카이브 로그를 분석해 실수로 변경된 데이터를 효과적으로 복구할 수 있습니다.
