---
title: "Oracle Flashback 복구 매뉴얼 3편"
date: 2025-06-16
categories: ["Categories","Database", "Oracle", "Backup_restore"]
taxonomy: Backup_restore
---

> **Database Level Flashback은 Flashback log를 사용하여 DB 전체를 과거로 롤백시키는 기술로, 대형 장애 발생 시에만 사용하는 것이 좋습니다.**

---

## 1. Database Level Flashback 개요

전통적인 복구 방식은 Backup 기점으로 장애 발생 시, 리두 / 아카이브 로그를 적용하여 복구를 했다.

Flashback Database 복구 방식은 Flashback log 라는 것을 적용하여 복구를 한다.

즉, Flashback Database 명령어는 redo log, archive log를 사용하는 것이 아니라, flashback log를 사용한다는 것이다.

그리고 Database Level Flashback 기술은 DB 전체를 과거로 롤백시키는 것이기 때문에, 대형 장애가 발생했을 때만 사용하는 것이 좋음. 특히 운영에서는 사용하기 힘듬.

---

## 2. Flashback 모드 설정

### 2-1. Flashback 모드 변경
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

### 2-2. ORA-38706, ORA-38709 에러 해결법
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

### 2-3. Flashback 모드 확인 및 DB OPEN
```sql
SQL> SELECT FLASHBACK_ON FROM V$DATABASE;
-- YES로 나오면 정상
SQL> alter database open;
```

### 2-4. RVWR 프로세스 실행 확인
```bash
ps -efl | grep [r]vwr
```

---

## 3. 테스트 데이터 준비

### 3-1. 원본 데이터 확인
```sql
SQL> select * from hm_test.test;
```

### 3-2. 원본 데이터가 없을 경우 DDL, DML 예시
```sql
SQL> create user hm_test identified by hm_test;
SQL> grant all privileges to hm_test;
SQL> create table hm_test.test (name varchar(10));
SQL> insert into hm_test.test values ('test');
SQL> insert into hm_test.test values ('test2');
SQL> insert into hm_test.test values ('test3');
SQL> insert into hm_test.test values ('test5');
SQL> select * from hm_test.test;
SQL> alter table hm_test.test enable row movement;
```

---

## 4. TRUNCATE 장애 상황 시뮬레이션

### 4-1. 테이블 TRUNCATE
```sql
SQL> truncate table hm_test.test;
SQL> select * from hm_test.test;
-- 결과: no rows selected
```

### 4-2. Table Level Flashback 시도 (실패)
```sql
SQL> flashback table hm_test.test to timestamp(systimestamp - interval '2' minute);
-- ORA-01466: unable to read data - table definition has changed
```

- ORA-01466은 truncate 명령어로 인해 테이블 구조가 바뀌었다고 복구가 안된다는 의미

---

## 5. Database Level Flashback 복구

### 5-1. Database Level Flashback 시도 (실패)
```sql
SQL> flashback database to timestamp(systimestamp - interval '3' minute);
-- ORA-38757: Database must be mounted and not open to FLASHBACK.
```

### 5-2. DB를 MOUNT 상태로 변경
```sql
SQL> shutdown immediate;
SQL> startup mount;
```

### 5-3. Database Level Flashback 실행
```sql
SQL> flashback database to timestamp(systimestamp - interval '10' minute);
-- Flashback complete.
```

### 5-4. DB OPEN (RESETLOGS)
```sql
SQL> ALTER DATABASE OPEN RESETLOGS;
-- resetlogs를 하는 이유는 flashback이 모든 데이터 파일을 과거 특정 시간으로 돌려버리기 때문에, 
-- 데이터 파일과 리두 로그, 컨트롤 파일의 SCN 정보가 달라진다. 그래서 초기화를 시켜줘야 한다.
```

### 5-5. 복구 완료 확인
```sql
SQL> select * from hm_Test.test;
-- 결과: test, test2, test3, test5
```

---

## 6. Flashback 기술 비교

- **Row Level Flashback**: 개별 행의 변경사항만 복구
  - 자세한 내용은 [Oracle Flashback 복구 매뉴얼 1편](/categories/database/oracle/backup_restore/Database-Oracle-Flashback-Recovery-1/) 참고

- **Table Level Flashback**: 테이블 전체를 과거 상태로 복구
  - 자세한 내용은 [Oracle Flashback 복구 매뉴얼 2편](/categories/database/oracle/backup_restore/Database-Oracle-Flashback-Recovery-2/) 참고

- **Database Level Flashback**: 데이터베이스 전체를 과거 상태로 복구
  - 대형 장애 시에만 사용 권장
  - 운영 환경에서는 신중하게 사용

---

> Database Level Flashback은 truncate 장애와 같은 대형 장애 복구에 필수적이지만, DB 전체를 롤백시키므로 운영 환경에서는 매우 신중하게 사용해야 합니다. 