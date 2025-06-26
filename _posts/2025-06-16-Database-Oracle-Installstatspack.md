---
title: "Install Oracle Statspack123"
date: 2025-06-16
categories: ["Categories","Database", "Oracle", "Install"]
---

# Oracle Statspack 설치 및 사용 가이드

## 개요

Database에 대한 부하 및 resource 사용량의 trend 분석이나 성능 문제 분석을 위하여 사용되는 tool입니다.

perfstat 사용자가 생성되고 perfstat에 성능 관련 정보가 저장됩니다.

### 에디션별 차이점

- **Standard Edition**: statspack 설치 필요
- **Enterprise Edition**: statspack 설치할 필요 없음
  - AWR (Automatic Workload Repository)
  - Enterprise Edition은 AWR이 파티셔닝 기능과 성능 수집하여 스냅샷으로 만들어 일정기간 보관 자동으로 이루어짐
  - 스냅샷 보관 주기: 8일

### SYSAUX Tablespace

오라클 10g 버전부터 나온 테이블스페이스로, 기존의 시스템 테이블스페이스에서 저장되고 관리되어 오던 여러 요소들 가운데 일부 또는 별도의 테이블스페이스의 생성을 요구하는 이들 요소를 한 곳에 저장, 관리하는 기능을 제공합니다.

Statspack 패키지, 정보 저장 공간 (PERFSTAT 유저 생성)

## 설치 및 설정 과정

### 1. job_queue_processes 확인

스냅샷이 언제 돌아가는지 확인합니다. value가 0이면 수행되고 있는 job이 없는 것입니다.

```sql
SELECT * FROM v$parameter
WHERE name LIKE '%job%';
```

### 2. 현재 수행 중인 job 확인

value 값이 있으면 현재 수행되고 있는 job을 확인합니다.

```sql
SELECT * FROM dba_jobs;
```

### 3. job 딕셔너리 확인

```sql
SELECT * FROM dict WHERE table_name LIKE '%SCHEDULE%';
```

### 4. 기설치 확인

조회했을 때 PERFSTAT 유저가 있으면, statspack 설치가 된 것입니다.

```sql
SELECT * FROM dba_users WHERE username = 'PERFSTAT';
```

### 5. 테이블스페이스 freespace 확인

SYSAUX 테이블스페이스 확인. 여기에 STATSPACK을 설치할 것입니다.

```sql
SELECT A.TABLESPACE_NAME
     , SUM(A.BYTES)/(1024*1024) AS "Total(MB)"
     , TRUNC((SUM(A.BYTES)/(1024*1024))-NVL(SUM(SZ_MB),0), 2) AS "USED(MB)"
     , TRUNC(NVL(SUM(SZ_MB),0), 2) AS "FREE(MB)"
     , TRUNC(NVL(( 1. - SUM(SZ_MB)/(SUM(A.BYTES)/(1024*1024)) ) * 100,100),2) AS "USAGE(%)"
  FROM DBA_DATA_FILES A
     , (SELECT FILE_ID, SUM(BYTES)/(1024*1024) AS SZ_MB
          FROM DBA_FREE_SPACE
         GROUP BY FILE_ID ) B
 WHERE A.FILE_ID = B.FILE_ID (+)
   AND A.TABLESPACE_NAME NOT IN (SELECT tablespace_name FROM dba_tablespaces WHERE contents = 'UNDO')
 GROUP BY A.TABLESPACE_NAME
 ORDER BY 5 DESC;
```

### 6. statspack 설치

`.bash_profile`에서 `$ORACLE_HOME` 확인하고, `$ORACLE_HOME/rdbms/admin/`으로 디렉토리 이동 후, sys로 접속합니다.

```bash
my-db07:dbhome_1/ > pwd           
/app/oracle/product/10g/dbhome_1

my-db07:dbhome_1/ > sqlplus / as sysdba
```

```
SQL*Plus: Release 10.2.0.5.0 - Production on Tue Apr 23 13:20:57 2024

Copyright (c) 1982, 2010, Oracle.  All Rights Reserved.

Connected to:
Oracle Database 10g Enterprise Edition Release 10.2.0.5.0 - 64bit Production
With the Partitioning, OLAP, Data Mining and Real Application Testing options

SQL> @spcreate.sql
Enter value for perfstat_password: perfstat
Enter value for default_tablespace: [perfstat 용 테이블스페이스 입력, 엔터시 default 테이블스페이스로 지정]
Enter value for temporary_tablespace: [perfstat 용 템프 테이블스페이스 입력, 엔터시 default 템프 테이블스페이스로 지정]
```

### 7. job 등록

perfstat 계정으로 접속해서 `@spauto.sql`로 디폴트 1시간마다 수집하는 job 등록합니다.
`spauto.sql`: 배치 스크립트 (1시간마다 작동이 기본)

```sql
SQL> SELECT * FROM DBA_SYS_PRIVS WHERE GRANTEE = 'PERFSTAT';
```

**job 권한이 없기 때문에, sys 계정으로 접속 후, job 권한을 부여해줍니다.**

```
GRANTEE                              PRIVILEGE                                        ADMIN_
------------------------------------------------------------ -------------------------------------------------------------------------------- ------
PERFSTAT                             CREATE TABLE                                     NO
PERFSTAT                             CREATE SESSION                                   NO
PERFSTAT                             CREATE PROCEDURE                                 NO
PERFSTAT                             CREATE SEQUENCE                                  NO
PERFSTAT                             CREATE PUBLIC SYNONYM                            NO
PERFSTAT                             DROP PUBLIC SYNONYM                              NO
PERFSTAT                             ALTER SESSION                                    NO

7 rows selected.
```

```sql
SQL> conn / as sysdba
Connected.
SQL> grant create any job to PERFSTAT;

Grant succeeded.
```

**perfstat으로 접속 후, @spauto.sql 실행**

```sql
SQL> connect perfstat/perfstat
Connected.
SQL> @spauto.sql

PL/SQL procedure successfully completed.

Job number for automated statistics collection for this instance
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Note that this job number is needed when modifying or removing
the job:

     JOBNO
----------
     1

Job queue process
~~~~~~~~~~~~~~~~~
Below is the current setting of the job_queue_processes init.ora
parameter - the value for this parameter must be greater
than 0 to use automatic statistics gathering:

NAME                     TYPE
------------------------------------ ----------------------
VALUE
------------------------------
job_queue_processes          integer
10

Next scheduled run
~~~~~~~~~~~~~~~~~~
The next scheduled run for this job is:

       JOB NEXT_DATE
---------- ------------
NEXT_SEC
----------------------------------------------------------------
     1 23-APR-24
14:00:00
```

### 8. dba_jobs에서 등록된 job 확인

```sql
SELECT * FROM dba_jobs;
```

## 스냅샷 관리

### 9. 수동 스냅샷 찍기

```sql
SQL> BEGIN statspack.snap; END; /

PL/SQL procedure successfully completed.
```

### 10. 스냅샷 확인

```sql
SELECT * FROM STATS$SNAPSHOT
ORDER BY snap_time DESC;
```

### 11. 스냅샷을 통해 statspack 리포트 생성

**주의사항**: 최소 2개 이상 스냅샷 찍어야 합니다. 스냅샷ID를 정확하게 입력해야 합니다.

예를 들면 스냅샷ID가 1,2인 기록밖에 없는데, 스냅샷 시작점 입력에 1, 스냅샷 종료점 입력에 3, 이렇게 입력하면 에러가 발생합니다.

```sql
SQL> conn perfstat/perfstat
Connected.
SQL> @?/rdbms/admin/spreport.sql
```

```
Listing all Completed Snapshots

                               Snap
Instance     DB Name        Snap Id   Snap Started    Level Comment
------------ ------------ --------- ----------------- ----- --------------------
ORCL19         ORCL19          1 28 Jul 2020 23:21      5
                  2 28 Jul 2020 23:23      5

Specify the Begin and End Snapshot Ids
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Enter value for begin_snap: 1 [스냅샷 시작점 입력(스냅샷 ID)]
Begin Snapshot Id specified: 1

Enter value for end_snap: 2  [스냅샷 종료점 입력(스냅샷 ID)]
End   Snapshot Id specified: 2

Enter value for report_name: [리포트 이름 입력, 엔터시 sp_(스냅샷 시작점)_(스냅샷 종료점).lst 으로 파일 생성됨]

      -------------------------------------------------------------

End of Report ( sp_1_2.lst )
```

**참고**: 끝나고 oracle 클라이언트 나온 다음에 해당 경로의 쉘에서 `vi "리포트 이름"`을 치면 볼 수 있습니다.

### 12. 불필요한 스냅샷 삭제

```sql
SQL> conn perfstat/perfstat
SQL> @?/rdbms/admin/sppurge.sql
```

```
Database Instance currently connected to
========================================

                Instance
   DB Id    DB Name    Inst Num Name
----------- ---------- -------- ----------
  323838205 ORCL19          1 ORCL19

Snapshots for this database instance
====================================

                   Base-  Snap
 Snap Id   Snapshot Started    line? Level Host        Comment
-------- --------------------- ----- ----- --------------- --------------------
       1  28 Jul 2020 23:21:03         5 ORACLE19
       2  28 Jul 2020 23:23:37         5 ORACLE19

Warning
~~~~~~~
sppurge.sql deletes all snapshots ranging between the lower and
upper bound Snapshot Id's specified, for the database instance
you are connected to.  Snapshots identified as Baseline snapshots
which lie within the snapshot range will not be purged.

It is NOT possible to rollback changes once the purge begins.

You may wish to export this data before continuing.

Specify the Lo Snap Id and Hi Snap Id range to purge
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Enter value for losnapid: 1  [삭제하고픈 스냅샷 시작점 입력(스냅샷 ID)]
Using 1 for lower bound.

Enter value for hisnapid: 2  [삭제하고픈 스냅샷 종료점 입력(스냅샷 ID)]
Using 2 for upper bound.

Deleting snapshots 1 - 2.

Number of Snapshots purged: 2
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Purge of specified Snapshot range complete.
```

## 스냅샷 레벨 설정

### 스냅샷 레벨별 설명

- **LEVEL 0**: 일반적인 성능 통계 정보를 수집
- **LEVEL 1**: (R9.2.0~)
- **LEVEL 5**: default 값으로 일반적인 통계정보에 추가하여 resource를 많이 사용하는 SQL에 대한 정보를 포함
- **LEVEL 6**: LEVEL 5 + SQL상세 실행계획 정보를 포함 (R9.0.1~)
- **LEVEL 7**: LEVEL 6 + 세그먼트 정보를 포함 (R9.2.0~)
- **LEVEL 10**: LEVEL 7 + 부모 Latch, 자식 Latch 정보 등을 포함

**주의사항**: Level이 높을수록 많은 resource를 필요로 하게 되며 특히 level 10의 경우 반드시 필요한 경우에만 사용해야 합니다.

### 스냅샷 레벨 설정 명령어

```sql
-- 특정 레벨로 스냅샷 실행
SQL> EXEC STATSPACK.SNAP(i_snap_level =>10);

-- 스냅샷 레벨의 디폴트값 변경
SQL> EXECUTE STATSPACK.MODIFY_STATSPACK_PARAMETER (i_snap_level => 0);
```
