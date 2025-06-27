---
title: "Install MySQL MHA 기능 테스트"
date: 2025-06-26
categories: ["Categories","Database", "MySQL", "Install"]
taxonomy: MySQL_Install
---

> **이 문서는 MySQL MHA(Master High Availability) 설치 후 Purge Relay Logs, Failover, Takeover 등 주요 기능 테스트 및 실전 운영 예시를 상세하게 다룹니다.**

---

## [Install MySQL MHA 설치 가이드](/categories/database/mysql/install/Database-MySQL-MHA-Install/)

---

## 1. Purge Relay Logs

- 릴레이 로그 자동/수동 삭제 기능
- MHA에서는 relay_log_purge 비활성화 권장, failover/switch-over 시 자동 purge
- 별도 purge 필요 시 `/usr/local/bin/purge_relay_logs` 스크립트 사용

**실행 예시:**
```bash
/usr/local/bin/purge_relay_logs \
  --user=mha --password=mha \
  --disable_relay_log_purge --port=3306
```

**자동화 스크립트 예시(clean_relay_log.sh):**
```bash
#!/bin/bash
CRL_USER=mha
CRL_PASSWORD=mha
CRL_PORT=3306
log_dir='/masterha/app1'
work_dir='/masterha/app1'
purge='/usr/local/bin/purge_relay_logs'
if [ ! -d $log_dir ]; then
   mkdir $log_dir -p
fi
$purge --user=$CRL_USER --password=$CRL_PASSWORD --disable_relay_log_purge --port=$CRL_PORT  >> $log_dir/purge_relay_logs.log 2>&1
```

**crontab 등록 예시:**
```bash
chmod 755 /etc/masterha/clean_relay_log.sh
crontab -e
* * * * * /etc/masterha/clean_relay_log.sh > /dev/null 2>&1
```

---

## 2. Failover 테스트

- Master 서버에서 MySQL 인스턴스 종료(systemctl stop mysqld)로 장애 유발
- Manager 서버에서 app1.log로 failover 로그 확인
- 정상적으로 failover가 이루어지면, 새로운 master/slave 구조로 전환됨

**로그 예시:**
```
app1: MySQL Master failover acs(192.168.56.11:3306) to acs2(192.168.56.13:3306) succeeded
Master acs(192.168.56.11:3306) is down!
Check MHA Manager logs at localhost.localdomain:/masterha/app1/app1.log for details.
Started automated(non-interactive) failover.
...
Master failover to acs2(192.168.56.13:3306) completed successfully.
```

- 신규 slave(구 master)에서 CHANGE MASTER TO로 복제 재설정 필요 (로그의 "All other slaves should start replication from here" 참고)

---

## 3. Takeover (Switch) 테스트

- masterha_master_switch 명령어로 수동 Takeover 수행
- 반드시 Manager 모니터링 중지 후 실행

**명령어 예시:**
```bash
masterha_stop --conf=/etc/masterha/app1.cnf
masterha_check_status --conf=/etc/masterha/app1.cnf
masterha_check_repl --conf=/etc/masterha/app1.cnf
masterha_master_switch --master_state=alive --conf=/etc/masterha/app1.cnf --new_master_host=acs --interactive=0
```

- 로그의 "All other slaves should start replication from here" 참고하여 slave 복제 재설정

---

## 4. 모니터링 및 운영

- masterha_manager 프로세스 재기동 후 정상 모니터링 상태 확인
- masterha_check_status, masterha_check_repl 등으로 상태 점검

---

> MHA 기능 테스트는 실제 장애/스위치 상황을 시뮬레이션하여 운영 환경에서의 신뢰성을 높이는 데 필수적입니다. 각 단계별 로그와 복제 상태를 꼼꼼히 확인하세요. 