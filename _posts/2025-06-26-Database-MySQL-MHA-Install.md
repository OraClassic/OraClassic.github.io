---
title: "Install MySQL MHA"
date: 2025-06-26
categories: ["Categories","Database", "MySQL", "Install"]
taxonomy: MySQL_Install
---

> **MySQL MHA(Master High Availability)는 MySQL Replication 환경에서 장애 발생 시 자동으로 Failover를 수행하는 고가용성 솔루션입니다. 실전 구축 예시와 모든 주요 설정, 트러블슈팅을 상세하게 정리합니다.**

---

## 1. 시작 전 체크리스트

- 방화벽, SELINUX 비활성화 필수 (설정 후 재부팅)
- 모든 서버의 `/etc/hosts`에 IP/호스트명/VIP 정보 등록

---

## 2. 환경 및 기본 정보

- conf 파일 위치: `/etc/masterha/`
- script 위치: `/masterha/scripts/`
- MHA 매니저/Remote 서버 실행 정보 및 로그 디렉토리: `/masterha/app1/`

### IP/호스트명
- Master: 192.168.56.11 (acs)
- Slave1: 192.168.56.13 (acs2)
- MHA Manager: 192.168.56.18 (mgr)
- Master DB VIP: 192.168.56.12 (mha-master-vip)

---

## 3. MySQL 설치

- Master, Slave 서버에만 설치 (Manager 서버는 불필요)
- 설치 방법은 [Simple Install MySQL 8.0.25 (RPM)](/categories/database/mysql/install/Database-MySQL-Simple-Install/) 참고

---

## 4. /etc/my.cnf 설정 (Master/Slave)

- server-id, log-bin, relay-log, log-error 등 Replication 및 로그 관련 설정 필수
- 설정 후 `systemctl restart mysqld` (에러 발생 시 error.log, 디렉토리/퍼미션/SELINUX 확인)

**Master 예시**
```ini
[mysqld]
server-id=1
log-bin=/usr/local/mysql/logs/binlog
sync_binlog=1
binlog_cache_size=2M
binlog_format=ROW
max_binlog_size=512M
expire_logs_days=7
log-bin-trust-function-creators=1
report-host=acs
relay-log=/usr/local/mysql/logs/relay_log
relay-log-index=/usr/local/mysql/logs/relay_log.index
relay_log_purge=off
log_slave_updates=ON
log-error=/usr/local/mysql/logs/error.log
```

**Slave 예시**
```ini
[mysqld]
server-id=2
log-bin=/usr/local/mysql/logs/binlog
sync_binlog=1
binlog_cache_size=2M
binlog_format=ROW
max_binlog_size=512M
log-bin-trust-function-creators=1
report-host=acs2
relay-log=/usr/local/mysql/logs/relay_log
relay-log-index=/usr/local/mysql/logs/relay_log.index
relay_log_purge=off
expire_logs_days=7
log_slave_updates=ON
log-error=/usr/local/mysql/logs/error.log
read_only=ON
```

---

## 5. Replication 설정 (Master/Slave)

- 인증 플러그인(caching_sha2_password) 이슈 주의: 반드시 `mysql_native_password`로 변경 필요
- repl_user 계정 생성 및 권한 부여

```sql
set global validate_password.policy=low;
set global validate_password.number_count=0;
set global validate_password.length=1;
create user 'repl_user'@'%' identified by 'repl_user';
grant replication slave on *.* to 'repl_user'@'%';
flush privileges;
```

**Master 상태 확인**
```sql
show master status\G;
```

**Slave 설정**
```sql
CHANGE MASTER TO MASTER_HOST='acs', MASTER_USER='repl_user', MASTER_PASSWORD='repl_user', MASTER_LOG_FILE='binlog.000001', MASTER_LOG_POS=866;
start slave;
show slave status\G;
```

**caching_sha2_password 이슈 해결**
```sql
alter user repl_user@'%' identified with mysql_native_password by 'repl_user';
flush privileges;
```

---

## 6. MHA 접속 DB 계정 생성 (Master/Slave)

```sql
CREATE USER mha@'%' IDENTIFIED BY 'mha';
GRANT ALL PRIVILEGES ON *.* TO 'mha'@'%';
FLUSH PRIVILEGES;
alter user mha@'%' identified with mysql_native_password by 'mha';
flush privileges;
```

---

## 7. OS 유저 생성 및 SSH 인증 설정 (모든 서버)

```bash
useradd -g mysql mha
passwd mha
su - mha
echo "export PATH=$PATH:/usr/local/bin:/usr/local/mysql/bin" >> ~/.bash_profile
source ~/.bash_profile
ssh-keygen -t rsa -b 4096
# 각 서버간 ssh-copy-id로 공개키 교환
```

---

## 8. MHA 유저 sudo 설정 및 VIP 테스트

- `/etc/sudoers`에 `mha ALL=(ALL) NOPASSWD:/sbin/ifconfig` 추가
- Master에서 `sudo ifconfig enp0s8:0 192.168.56.12 netmask 255.255.255.0 up`로 VIP 할당 테스트

---

## 9. MHA 설치

### 9-1. 필수 패키지 설치 (모든 서버)
```bash
yum update
yum -y install gcc-c++
yum install epel-release -y
yum install perl*
yum install cpan
yum -y install epel perl-devel perl-CPAN perl-DBD-MySQL perl-Config-Tiny perl-Log-Dispatch perl-Parallel-ForkManager perl-Module-Install cpan perl* wget
```

### 9-2. Perl 모듈 수동 설치 (에러 발생 시)
```bash
cpan YAML
cpan -MScalar::Util
perl -MCPAN -e "install File::Remove"
perl -MCPAN -e "install Build"
perl -MCPAN -e "install Module::Install"
perl -MCPAN -e "install Net::Telnet"
perl -MCPAN -e "install Log::Dispatch"
cpan Parallel::ForkManager
cpanm List::MoreUtils
```

### 9-3. MHA Manager 설치 (Manager 서버)
```bash
mkdir -p /root/pkg
cd /root/pkg
yum install wget
wget https://github.com/yoshinorim/mha4mysql-manager/releases/download/v0.58/mha4mysql-manager-0.58.tar.gz
tar zxvf mha4mysql-manager-0.58.tar.gz
cd mha4mysql-manager-0.58
perl Makefile.PL
make;make install
```

### 9-4. MHA Node 설치 (모든 서버)
```bash
mkdir -p /root/pkg
cd /root/pkg
wget https://github.com/yoshinorim/mha4mysql-node/releases/download/v0.58/mha4mysql-node-0.58.tar.gz
tar zxvf mha4mysql-node-0.58.tar.gz
cd mha4mysql-node-0.58
perl Makefile.PL
make;make install
```

---

## 10. 후속 작업 및 스크립트 설정

- `/usr/bin/mysqlbinlog`, `/usr/local/bin/mysql` 심볼릭 링크 생성
- Manager: `/etc/masterha`, `/masterha/scripts` 디렉토리 생성 및 샘플 conf/scripts 복사
- 공통: `/masterha/app1` 생성, 소유권 변경

### 10-1. app1.cnf 설정 (Manager)
- `/etc/masterha/app1.cnf` 파일 생성 및 권한/소유자 설정
- 샘플 conf 참고

### 10-2. master_ip_failover, master_ip_online_change 스크립트 수정 및 `mha_change_vip.sh` 추가
- 기존 주석 처리, `system("/bin/bash /masterha/scripts/mha_change_vip.sh $new_master_ip");` 추가
- `mha_change_vip.sh`는 신규 생성, 실행권한 부여

---

## 11. 모니터링 및 체크

- masterha_check_ssh : SSH 접속 체크
- masterha_manager : Manager 실행(모니터링 시작)
- masterha_stop : Manager 중지
- masterha_master_switch : TakeOver(relocate) 수행
- masterha_check_repl : 복제 현황 체크
- masterha_check_status : Status 확인

### 주요 에러 및 해결
- Perl 모듈/패키지 누락 시 에러 발생 → 패키지 재설치, perl* 재설치로 해결
- 권한 부족, 계정 권한 미부여, SSH 키 미설정 등도 주요 원인

---

## 12. MHA 기능 및 테스트

- MHA 기능 테스트 및 상세 사용법은 [Install MySQL MHA 기능 테스트](/categories/database/mysql/install/Database-MySQL-MHA-Function-Test/) 참고

---

> MHA 구축은 환경별로 다양한 트러블슈팅이 필요하므로, 각 단계별 로그와 에러 메시지를 꼼꼼히 확인하며 진행하세요. 