---
title: "Oracle Hot Backup 매뉴얼"
date: 2025-06-16
categories: ["Categories","Database", "Oracle", "Backup_restore"]
taxonomy: Backup_restore
---

> **Oracle Hot Backup은 운영 중인 데이터베이스의 테이블스페이스 단위로 백업을 수행할 수 있는 방법입니다. Archive log mode가 필수이며, 24시간 운영 서버에서 많이 사용됩니다.**

---

## 1. Cold Backup과 Hot Backup의 차이

- **Cold Backup**: shutdown immediate 이후, ctl, dbf, log 파일들을 복사(cp)하면 끝.
- **Hot Backup**: 운영 도중 백업이 필요할 때 사용. Media Hot Backup이나 expdp, exp를 활용.

> expdp/impdp 기술 블로그 참고: [https://blog.naver.com/ricky63/223514278181](https://blog.naver.com/ricky63/223514278181)

- 24시간 운영 서버는 Logical Backup(expdp, exp)이나 Media Hot Backup을 많이 사용
- 트랜잭션이 활발하면 Logical Backup은 시간도 오래 걸리고 제약조건 에러가 발생할 수 있으니, Media Hot Backup을 쉘 스크립트로 자동화하는 것이 좋음

---

## 2. Hot Backup 개념 및 동작 원리

- Media Hot Backup은 **테이블스페이스 단위**로 백업
- 각 테이블스페이스를 백업 모드로 설정 후 백업, 끝나면 백업 모드 해제
- 반드시 DB가 **Archive log mode** 상태여야 함
- Archive log mode가 아니면 아래와 같은 에러 발생:

```sql
SQL> alter tablespace users begin backup;
ORA-01123: cannot start online backup; media recovery not enabled
```

- Hot backup 과정:
  1. begin backup 명령 시, checkpoint 후 DB Buffer Cache에서 데이터 파일로 저장
  2. end backup 명령 전까지 checkpoint 없음
  3. end backup 명령 시, 백업 도중 변경된 내용을 리두/아카이브 로그에서 찾아 적용
  4. 다시 checkpoint 발생

---

## 3. Hot Backup 실습 절차

### 3-1. 백업 대상 테이블스페이스 확인

```sql
SQL> set line 200
col name for a50
col status for a15
select a.file#, c.name as tablespace_name, a.name, b.status, to_char(b.time, 'YYYY-MM-DD:HH24:MI:SS') as time from v$datafile a, v$backup b, v$tablespace c where a.file#=b.file# and a.TS#=c.TS#;
```

예시 결과:

| FILE# | TABLESPACE_NAME | NAME | STATUS | TIME |
|-------|-----------------|--------------------------------------------------|---------------|-------------------|
| 1 | SYSTEM | /app/oradata/ORCL/system01.dbf | NOT ACTIVE | 2024-06-12:18:59:40 |
| 3 | SYSAUX | /app/oradata/ORCL/sysaux01.dbf | NOT ACTIVE | 2024-06-12:19:00:09 |
| 4 | UNDOTBS1 | /app/oradata/ORCL/undotbs01.dbf | NOT ACTIVE | 2024-06-12:19:00:18 |
| 7 | USERS | /app/oradata/ORCL/users01.dbf | NOT ACTIVE | 2024-06-12:19:00:24 |


### 3-2. 테이블스페이스별 백업 진행

(아래 예시는 system 테이블스페이스, 나머지도 동일하게 반복)

```sql
SQL> alter tablespace system begin backup;
SQL> !cp /app/oradata/ORCL/system01.dbf /app/backup
SQL> alter tablespace system end backup;
```

### 3-3. control file 백업

```sql
SQL> alter database backup controlfile to trace as '/app/backup/control.trc';
```

> **참고:** HOT BACKUP은 데이터 파일, 컨트롤 파일만 백업이 가능하다. 리두 로그까지 백업하려면 COLD BACKUP을 사용해야 한다. 