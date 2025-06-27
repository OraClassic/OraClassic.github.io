---
title: "Oracle 쿼리 결과 줄바꿈 제거 (엔터키 제거)"
date: 2025-06-17
categories: ["Categories","Database", "Oracle", "Etc"]
taxonomy: Oracle_Etc
---

> **데이터에 줄바꿈이 포함되어 있으면 스프레드시트에서 결과를 추출할 때 줄바꿈마다 로우가 분리되는 문제가 발생합니다.**

---

## 1. 문제 상황

데이터베이스에서 쿼리 결과를 스프레드시트로 추출할 때, 데이터에 줄바꿈(엔터키)이 포함되어 있으면 다음과 같은 문제가 발생합니다:

- 줄바꿈마다 새로운 로우로 분리됨
- 데이터의 원래 구조가 깨짐
- 스프레드시트 분석 시 데이터 정합성 문제

---

## 2. 해결 방법

### 2-1. REPLACE 함수를 사용한 줄바꿈 제거
```sql
SELECT 
    replace(replace("줄바꿈 제거할 컬럼명", chr(10), ''), chr(13), '') 
FROM 테이블명;
```

### 2-2. 함수 설명
- `chr(10)`: Line Feed (LF) - 줄바꿈 문자
- `chr(13)`: Carriage Return (CR) - 캐리지 리턴 문자
- `replace()`: 문자열 치환 함수

---

## 3. 사용 예시

### 3-1. 기본 사용법
```sql
-- 원본 데이터 (줄바꿈 포함)
SELECT comments FROM user_feedback;

-- 줄바꿈 제거된 결과
SELECT 
    replace(replace(comments, chr(10), ''), chr(13), '') as clean_comments 
FROM user_feedback;
```

### 3-2. 여러 컬럼에 적용
```sql
SELECT 
    id,
    name,
    replace(replace(description, chr(10), ''), chr(13), '') as clean_description,
    replace(replace(notes, chr(10), ''), chr(13), '') as clean_notes
FROM products;
```

### 3-3. 조건절과 함께 사용
```sql
SELECT 
    replace(replace(content, chr(10), ''), chr(13), '') as clean_content
FROM documents 
WHERE length(content) > 100;
```

---

## 4. 주의사항

### 4-1. 데이터 타입 확인
- CLOB 타입의 경우 추가적인 처리가 필요할 수 있음
- 매우 긴 텍스트의 경우 성능에 영향을 줄 수 있음

### 4-2. 공백 처리
```sql
-- 줄바꿈을 공백으로 대체하고 싶은 경우
SELECT 
    replace(replace(comments, chr(10), ' '), chr(13), ' ') as comments_with_space
FROM user_feedback;
```

### 4-3. 여러 줄바꿈 문자 처리
```sql
-- 연속된 줄바꿈을 하나의 공백으로 처리
SELECT 
    regexp_replace(comments, '[\r\n]+', ' ') as clean_comments
FROM user_feedback;
```

---

## 5. 고급 활용법

### 5-1. 정규식을 사용한 방법
```sql
-- 모든 종류의 줄바꿈 문자 제거
SELECT 
    regexp_replace(comments, '[\r\n\t]', '') as clean_comments
FROM user_feedback;
```

### 5-2. 함수로 만들어서 재사용
```sql
-- 사용자 정의 함수 생성
CREATE OR REPLACE FUNCTION remove_newlines(p_text IN VARCHAR2) 
RETURN VARCHAR2 IS
BEGIN
    RETURN replace(replace(p_text, chr(10), ''), chr(13), '');
END;
/

-- 함수 사용
SELECT 
    remove_newlines(comments) as clean_comments
FROM user_feedback;
```

---

> 줄바꿈 제거는 데이터 추출 시 매우 유용하지만, 원본 데이터의 가독성을 해칠 수 있으므로 필요에 따라 적절히 사용하세요. 