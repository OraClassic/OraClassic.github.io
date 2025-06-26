---
title: "Oracle expdp & impdp 사용 매뉴얼"
date: 2025-06-16 00:00:00 +0900
categories: ["Categories","Database", "Oracle", "Install"]
permalink: /categories/Database/Oracle/Install
---

# Oracle expdp & impdp 사용 매뉴얼

## expdp 사용 예시

```bash
expdp system/oracle dumpfile=test.dmp directory=DATAPUMP tables=FOX.FOX_FC,FOX.FOX_FC_Q logfile=test.log
```

## impdp 사용 예시

```bash
impdp system/oracle dumpfile=test.dmp directory=DATADUMP logfile=test.log table_exists_action=REPLACE
```

### TABLE_EXISTS_ACTION 옵션
- **SKIP**: 여러 테이블을 import 하는 경우 해당 테이블을 skip 하고 다음 테이블을 import (기본값)
- **APPEND**: 기존 행을 놔둔 채로 import
- **TRUNCATE**: 기존 행을 삭제한 뒤 import
- **REPLACE**: 기존 테이블을 삭제한 뒤 테이블을 재생성하고 import

> ※ 1번(SKIP)과 4번(REPLACE) 방식은 "CONTENT=DATA_ONLY" 옵션을 사용한 경우 무시됨

---

## ORA-39151 에러 발생 시
impdp 사용할 때 table_exists_action을 디폴트(SKIP)가 아닌 다른 옵션으로 지정하면 해결됨.

---

## Oracle Directory 생성/삭제/권한 부여 예시

- **생성**
  ```sql
  CREATE DIRECTORY DATAPUMP as '/DATA_PUMP';
  ```
- **삭제**
  ```sql
  DROP DIRECTORY DATAPUMP;
  ```
- **권한 부여**
  ```sql
  GRANT READ,WRITE ON DIRECTORY DATAPUMP to fox;
  ```

---

## expdp/impdp 백그라운드 제어 및 KILL 방법

expdp & impdp는 도중에 ctrl+c를 해도 취소가 안됨 (백그라운드에서 계속 동작)

1. **프롬프트에서 impdp/expdp interactive 상태로 변경**
   ```bash
   $ impdp dmp/dmp attach='JOB_NAME'
   ```
   - JOB_NAME 확인: 
     ```sql
     select * from v$session where action like '%IMPORT%';
     ```
2. **상태 확인**
   ```
   Import> status
   ```
3. **작업 중지/종료**
   ```
   Import> KILL_JOB
   ```
4. **작업 상태 확인**
   ```sql
   select * from dba_datapump_jobs;
   ```

---

> 오라클 백업/복구 실무에서 자주 쓰는 expdp/impdp 명령어와 에러 해결법, 그리고 데이터펌프 디렉토리 관리 팁을 정리했습니다. 