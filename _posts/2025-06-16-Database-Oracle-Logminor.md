---
title: "Oracle Log Miner 사용 매뉴얼"
date: 2025-06-16 04:00:00 +0900
categories: ["Categories","Database", "Oracle","Backup_restore"]
---

# Oracle LogMiner 매뉴얼 및 복구 테스트 (12c 이상)

#Oracle #CentOS7 #로그마이너 #logminor #백업복구

오라클에서 아카이브 로그가 활성화된 상태라면, 트랜잭션이 일어날 때 리두 로그에 의해 아카이브 로그가 적재된다. 쉽게 설명하자면, 아카이브 로그는 사용자들이 실행한 트랜잭션의 히스토리를 Binary로 저장한 파일이라고 보면 된다. 그리고 해당 트랜잭션의 역실행 로그인 언두 로그도 아카이브 로그에 기록된다.

만약 사용자들이 DML(UPDATE, DELETE, INSERT) 명령어를 잘못 입력하여 운영 데이터에 영향을 끼쳤다면 어떻게 해야 할까?

이럴 때 아카이브 로그를 확인해야 하는데, Binary로 되어 있어서 사람이 볼 수 없다. 따라서 LogMiner를 이용해서 아카이브 로그를 해독해야 한다.

---

## 테스트 전 사전 작업

### 로그 마이너 설치 확인
```sql
SQL> desc dbms_logmnr
```
- 만약 logmnr이 없으면 아래 명령어 실행
```sql
SQL> @/app/ora19c/19c/rdbms/admin/dbmslm.sql
```

### supplemental 로그 설정 확인
```sql
SQL> select supplemental_log_data_min from v$database;
-- NO라면 아래 명령어로 활성화
SQL> alter database add supplemental log data;
SQL> select supplemental_log_data_min from v$database;
-- YES로 변경됨
```

### 오라클 archive log 상태 확인 및 활성화
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

### Archive log 디렉토리 생성
```bash
[oracle@oraser01 dbs]$ mkdir -p /app/ora19c/19c/dbs/arch
```

---

## LogMiner 실습 예시

1. **테스트 테이블 생성 및 데이터 입력**
```sql
SQL> create table hm_test.test (name varchar(10));
SQL> insert into hm_test.test values ('test');
SQL> insert into hm_test.test values ('test2');
SQL> insert into hm_test.test values ('test3');
SQL> insert into hm_test.test values ('test5');
SQL> select * from hm_test.test;
```

2. **LogMiner 디렉토리 생성**
```bash
[oracle@oraser01 admin]$ mkdir -p /app/logmnr
```

3. **상황 설명**
- 사용자가 실수로 데이터를 변경하여 복구가 필요한 상황
- 예시: 'test99', 'test2', 'test5'로 변경됨

4. **Oracle 디렉토리 및 딕셔너리 파일 생성**
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

5. **분석할 로그 파일 추가**
```sql
SQL> exec dbms_logmnr.add_logfile('/app/oradata/ORCL/redo01.log',1);
SQL> exec dbms_logmnr.add_logfile('/app/oradata/ORCL/redo02.log',3);
SQL> exec dbms_logmnr.add_logfile('/app/oradata/ORCL/redo03.log',3);
```

6. **등록 log 파일 분석 시작**
```sql
SQL> exec dbms_logmnr.start_logmnr(dictfilename=>'/app/logmnr/logmnrdict.ora');
```

7. **분석 결과 조회 및 복구**
```sql
# 트랜잭션 조회
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
