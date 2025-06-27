---
title: "Oracle Clone DB를 활용한 시점 복구 매뉴얼 2편"
date: 2025-06-17
categories: ["Categories","Database", "Oracle", "Backup_restore"]
taxonomy: Backup_restore
---

> **Clone DB를 생성한 후, DB Link를 이용해 데이터 복구를 수행하는 실전 절차를 안내합니다.**

---

## 1. 개요 및 참고 자료

- Clone DB 생성 방법 블로그 참고: [Clone DB & DB Link를 이용한 데이터 복구 (1)](https://blog.naver.com/ricky63/223525948222)
- 이 문서는 Clone DB 생성 이후, DB Link를 활용한 데이터 복구 실전 예시를 다룹니다.

---

## 2. DB Link 복구를 위한 전제 조건

- Oracle Instance가 2개 이상
- 연결할 두 DB의 HOSTNAME과 ORACLE_SID가 달라야 함
- NLS_CHARACTER SET은 동일해야 함

> Clone DB를 생성했다면 위 조건은 이미 충족된 상태입니다.

---

## 3. 네트워크 환경 설정

### 3-1. tnsnames.ora에 Clone SID 추가
```bash
vi /app/ora19c/19c/network/admin/tnsnames.ora

HMTEST =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = hm_test)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = hmtest)
    )
  )

clonedb =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = 192.168.56.20)(PORT = 1522))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = CLONE1)
    )
  )

LISTENER_HMTEST =
  (ADDRESS = (PROTOCOL = TCP)(HOST = hm_test)(PORT = 1521))
```

### 3-2. listener.ora 설정 (포트, SID별로 분리)
```bash
# listener.ora 예시
LISTENER =
  (DESCRIPTION_LIST =
    (DESCRIPTION =
      (ADDRESS = (PROTOCOL = TCP)(HOST = 192.168.56.20)(PORT = 1521))
      (ADDRESS = (PROTOCOL = IPC)(KEY = EXTPROC1521))
    )
  )

SID_LIST_LISTENER=
 (SID_LIST =
  (SID_DESC =
     (ORACLE_HOME=/app/ora19c/19c)
     (SID_NAME=hmtest)
  )
 )

LISTENER2 =
  (DESCRIPTION_LIST =
    (DESCRIPTION =
      (ADDRESS = (PROTOCOL = TCP)(HOST = 192.168.56.20)(PORT = 1522))
    )
  )

SID_LIST_LISTENER2=
 (SID_LIST =
  (SID_DESC =
     (ORACLE_HOME=/app/ora19c/19c)
     (SID_NAME=CLONE1)
  )
 )
```

### 3-3. 리스너 재시작 및 상태 확인
```bash
lsnrctl stop
lsnrctl start
lsnrctl status listener
lsnrctl status listener2
```

---

## 4. DB Link 생성 및 데이터 복구

### 4-1. DB Link 생성
```sql
SQL> create database link clinkab connect to hm_test identified by hm_test using 'clonedb';
```

### 4-2. Clone DB 데이터 조회
```sql
SQL> select * from hm_test.test@clinkab;
```

### 4-3. 원본 DB에 데이터 복구
```sql
SQL> create table hm_test.test as (select * from hm_test.test@clinkab);
SQL> select * from hm_test.test;
```

---

> 이로써 Clone DB와 DB Link를 활용한 데이터 복구가 완료됩니다. 추가적인 DB Link 활용법은 별도 포스트에서 다룹니다. 