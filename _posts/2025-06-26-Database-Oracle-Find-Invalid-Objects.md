---
title: "Oracle 패키지에서 invalid 난 object 찾는 방법"
date: 2025-06-26
categories: ["Categories","Database", "Oracle", "Etc"]
taxonomy: Oracle_Etc
---

> **마이그레이션 작업이나 테이블 이름 변경 작업 시 패키지에서 에러가 발생할 수 있으며, DBA_DEPENDENCIES와 ALL_OBJECTS 딕셔너리를 활용하여 문제를 찾아낼 수 있습니다.**

---

## 1. 문제 상황

마이그레이션 작업을 하거나 테이블 이름 변경 작업을 하다보면, 패키지에서 에러가 발생할 수 있다.

그런 경우에는 DBA_DEPENDENCIES 딕셔너리와 ALL_OBJECTS 딕셔너리를 서브쿼리로 조인해서 찾아내면 된다.

---

## 2. 딕셔너리 설명

### 2-1. DBA_DEPENDENCIES 딕셔너리
DBA_DEPENDENCIES 딕셔너리는 해당 프로시저, 패키지, 트리거 등과 같은 객체에 어떤 테이블들의 객체가 존재하는지 확인할 수 있는 딕셔너리이다.

**주요 컬럼:**
- `NAME`: 의존성을 가진 객체명
- `REFERENCED_NAME`: 참조되는 객체명
- `REFERENCED_TYPE`: 참조되는 객체 타입

### 2-2. ALL_OBJECTS 딕셔너리
ALL_OBJECTS 딕셔너리는 데이터베이스의 모든 객체 정보를 담고 있으며, 객체의 상태(STATUS)를 확인할 수 있다.

**주요 컬럼:**
- `OBJECT_NAME`: 객체명
- `OBJECT_TYPE`: 객체 타입
- `STATUS`: 객체 상태 (VALID/INVALID)

---

## 3. Invalid Object 찾는 방법

### 3-1. 기본 쿼리
```sql
SELECT * FROM ALL_OBJECTS 
WHERE OBJECT_NAME IN (
    SELECT REFERENCED_NAME 
    FROM DBA_DEPENDENCIES 
    WHERE NAME = 'PKG_RECORDING'
) 
AND STATUS != 'VALID';
```

### 3-2. 더 상세한 정보 조회
```sql
SELECT 
    ao.OBJECT_NAME,
    ao.OBJECT_TYPE,
    ao.STATUS,
    ao.CREATED,
    ao.LAST_DDL_TIME
FROM ALL_OBJECTS ao
WHERE ao.OBJECT_NAME IN (
    SELECT REFERENCED_NAME 
    FROM DBA_DEPENDENCIES 
    WHERE NAME = 'PKG_RECORDING'
) 
AND ao.STATUS != 'VALID'
ORDER BY ao.OBJECT_TYPE, ao.OBJECT_NAME;
```

---

## 4. 다양한 활용 예시

### 4-1. 특정 패키지의 모든 의존성 확인
```sql
SELECT 
    d.REFERENCED_NAME,
    d.REFERENCED_TYPE,
    ao.STATUS
FROM DBA_DEPENDENCIES d
LEFT JOIN ALL_OBJECTS ao ON d.REFERENCED_NAME = ao.OBJECT_NAME
WHERE d.NAME = 'PKG_RECORDING'
ORDER BY ao.STATUS DESC, d.REFERENCED_TYPE;
```

### 4-2. Invalid 상태인 모든 패키지 의존성 찾기
```sql
SELECT 
    d.NAME as PACKAGE_NAME,
    d.REFERENCED_NAME,
    d.REFERENCED_TYPE,
    ao.STATUS
FROM DBA_DEPENDENCIES d
JOIN ALL_OBJECTS ao ON d.REFERENCED_NAME = ao.OBJECT_NAME
WHERE ao.STATUS != 'VALID'
AND d.REFERENCED_TYPE IN ('TABLE', 'VIEW', 'PROCEDURE', 'FUNCTION')
ORDER BY d.NAME, ao.STATUS;
```

### 4-3. 특정 테이블을 참조하는 모든 객체 확인
```sql
SELECT 
    d.NAME as DEPENDENT_OBJECT,
    d.TYPE as OBJECT_TYPE,
    ao.STATUS
FROM DBA_DEPENDENCIES d
LEFT JOIN ALL_OBJECTS ao ON d.NAME = ao.OBJECT_NAME
WHERE d.REFERENCED_NAME = 'TARGET_TABLE_NAME'
ORDER BY ao.STATUS DESC, d.TYPE;
```

---

## 5. 실전 활용 가이드

### 5-1. 마이그레이션 전 체크리스트
```sql
-- 1. 전체 Invalid 객체 확인
SELECT OBJECT_TYPE, COUNT(*) as INVALID_COUNT
FROM ALL_OBJECTS 
WHERE STATUS != 'VALID'
GROUP BY OBJECT_TYPE;

-- 2. 특정 패키지의 의존성 상태 확인
SELECT 
    d.REFERENCED_NAME,
    d.REFERENCED_TYPE,
    ao.STATUS
FROM DBA_DEPENDENCIES d
LEFT JOIN ALL_OBJECTS ao ON d.REFERENCED_NAME = ao.OBJECT_NAME
WHERE d.NAME = 'TARGET_PACKAGE_NAME';
```

### 5-2. 테이블 리네임 전 확인사항
```sql
-- 리네임할 테이블을 참조하는 모든 객체 확인
SELECT 
    d.NAME as DEPENDENT_OBJECT,
    d.TYPE as OBJECT_TYPE,
    ao.STATUS
FROM DBA_DEPENDENCIES d
LEFT JOIN ALL_OBJECTS ao ON d.NAME = ao.OBJECT_NAME
WHERE d.REFERENCED_NAME = 'OLD_TABLE_NAME'
AND d.REFERENCED_TYPE = 'TABLE';
```

---

## 6. 주의사항

### 6-1. 권한 확인
- DBA_DEPENDENCIES는 DBA 권한이 필요할 수 있음
- USER_DEPENDENCIES를 사용하여 현재 사용자의 객체만 확인 가능

### 6-2. 실전 권장사항
물론 실전에서는 테이블 리네임을 하거나 마이그를 하거나 그런 상황에서는 하기 전에 무조건 ALL_OBJECTS의 STATUS 검수를 여러번 진행해봐야 한다.

### 6-3. 성능 고려사항
- 대용량 데이터베이스에서는 쿼리 성능에 주의
- 인덱스가 있는 컬럼을 활용하여 조회

---

> 마이그레이션 작업 전후로 반드시 객체 상태를 확인하여 데이터베이스의 안정성을 보장하세요. 