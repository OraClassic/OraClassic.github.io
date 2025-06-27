---
title: "MySQL InnoDB Cluster Function Test"
categories: ["Categories","Database", "MySQL", "Install"]
taxonomy: MySQL_Install
date: 2025-06-26
---

> **이 포스트는 MySQL InnoDB Cluster 환경에서 장애, 복구, Primary 전환, 멤버 관리, 라우터 다중화 등 실제 운영에서 반드시 알아야 할 모든 기능 테스트와 실전 운영 예시를 상세하게 다룹니다.**

# 1. InnoDB Cluster 구성 변경 및 작업

## 클러스터 상태 조회

아무 서버 접속해서 실행

```js
MySQL  ic-server1:3306 ssl  JS > var cluster = dba.getCluster()
MySQL  ic-server1:3306 ssl  JS > cluster.status()
```

```json
{
    "clusterName": "HmCluster",
    "defaultReplicaSet": {
        "name": "default",
        "primary": "ic-server1:3306",
        "ssl": "REQUIRED",
        "status": "OK",
        "statusText": "Cluster is ONLINE and can tolerate up to ONE failure.",
        "topology": {
            "ic-server1:3306": {
                "address": "ic-server1:3306",
                "memberRole": "PRIMARY",
                "mode": "R/W",
                "readReplicas": {},
                "replicationLag": "applier_queue_applied",
                "role": "HA",
                "status": "ONLINE",
                "version": "8.0.35"
            },
            "ic-server2:3306": {
                "address": "ic-server2:3306",
                "memberRole": "SECONDARY",
                "mode": "R/O",
                "readReplicas": {},
                "replicationLag": "applier_queue_applied",
                "role": "HA",
                "status": "ONLINE",
                "version": "8.0.35"
            },
            "ic-server3:3306": {
                "address": "ic-server3:3306",
                "memberRole": "SECONDARY",
                "mode": "R/O",
                "readReplicas": {},
                "replicationLag": "applier_queue_applied",
                "role": "HA",
                "status": "ONLINE",
                "version": "8.0.35"
            }
        },
        "topologyMode": "Single-Primary"
    },
    "groupInformationSourceMember": "ic-server1:3306"
}
```

---

## 1-1. 인스턴스 장애

### 1-1-1. Primary(Master, Source) 접속 및 정보 확인

```js
MySQL  ic-router1:6446 ssl  JS > \sql select user(), @@hostname, @@read_only;
```

```
+-----------------------+------------+-------------+
| user()                | @@hostname | @@read_only |
+-----------------------+------------+-------------+
| clusteradm@ic-router1 | ic-server1 |           0 |
+-----------------------+------------+-------------+
1 row in set (0.0006 sec)
```

### 1-1-2. ic-server1의 MySQL을 종료하여 장애가 발생했다고 가정

```bash
[root@ic-server1 ~]# systemctl stop mysqld
```

#### ic-server2의 mysqld.log 확인

```
2023-11-05T00:11:08.911812Z 0 [Warning] [MY-011499] [Repl] Plugin group_replication reported: 'Members removed from the group: ic-server1:3306'
2023-11-05T00:11:08.911842Z 0 [System] [MY-011500] [Repl] Plugin group_replication reported: 'Primary server with address ic-server1:3306 left the group. Electing new Primary.'
2023-11-05T00:11:08.911895Z 0 [System] [MY-011507] [Repl] Plugin group_replication reported: 'A new primary with address ic-server3:3306 was elected. The new primary will execute all previous group transactions before allowing writes.'
2023-11-05T00:11:08.912314Z 0 [System] [MY-011503] [Repl] Plugin group_replication reported: 'Group membership changed to ic-server3:3306, ic-server2:3306 on view 17084748103049284:8.'
2023-11-05T00:11:08.912688Z 116133 [System] [MY-011565] [Repl] Plugin group_replication reported: 'Setting super_read_only=ON.'
2023-11-05T00:11:08.912746Z 116133 [System] [MY-011511] [Repl] Plugin group_replication reported: 'This server is working as secondary member with primary member address ic-server3:3306.'
```

#### ic-router1의 mysqlrouter.log 확인

```
2024-02-22 11:48:48 metadata_cache WARNING [7ff9b4188700] Failed connecting with Metadata Server ic-server1:3306: Lost connection to MySQL server at 'reading initial communication packet', system error: 104 (2013)
2024-02-22 11:48:48 metadata_cache WARNING [7ff9b4188700] While updating metadata, could not establish a connection to cluster 'HmCluster' through ic-server1:3306
2024-02-22 11:48:48 metadata_cache WARNING [7ff9b4188700] Member ic-server1:3306 (9739f695-7f5b-11ee-8ed7-080027755b7a) defined in metadata not found in actual Group Replication
2024-02-22 11:48:48 metadata_cache INFO [7ff9b4188700] Potential changes detected in cluster after metadata refresh (view_id=0)
2024-02-22 11:48:48 metadata_cache INFO [7ff9b4188700] Metadata for cluster 'HmCluster' has 3 member(s), single-primary:
2024-02-22 11:48:48 metadata_cache INFO [7ff9b4188700]     ic-server1:3306 / 33060 - mode=n/a
2024-02-22 11:48:48 metadata_cache INFO [7ff9b4188700]     ic-server2:3306 / 33060 - mode=RO
2024-02-22 11:48:48 metadata_cache INFO [7ff9b4188700]     ic-server3:3306 / 33060 - mode=RW
```

### 1-1-3. 장애 발생 후 클러스터 상태 조회

장애 발생 후, 클러스터 상태를 조회하면 새로운 Primary가 선출되고, 장애 노드는 (MISSING) 상태로 표시됩니다.

### 1-1-4. 장애 감지 및 자동 Failover

Group Replication은 멤버 장애를 감지하고, 필요시 Secondary를 Primary로 자동 승격합니다. 정족수 미달 시에는 내결함성이 사라집니다.

관련 옵션: `group_replication_member_expel_timeout` (기본 0 또는 5)

---

## 1-2. 인스턴스 복구

중지된 인스턴스(MySQL)를 다시 시작하면, 클러스터에 자동으로 재합류합니다.

```bash
sudo systemctl start mysqld
```

mysqld.log, mysqlrouter.log에서 정상 합류 로그를 확인할 수 있습니다.

---

## 1-3. Primary(Master) 재선정

장애로 인해 변경된 Primary를 다시 원래 서버로 변경하려면 아래 명령어를 사용합니다.

```js
var cluster = dba.getCluster()
cluster.setPrimaryInstance('ic-server1:3306')
```

별도의 재시작 없이 Primary가 변경됩니다.

---

## 1-4. 멤버 제거 및 추가

특정 인스턴스를 클러스터에서 제거하려면:

```js
cluster.removeInstance('clusteradm@ic-server3:3306')
```

- 트랜잭션이 남아있으면 dba.gtidWaitTimeout(기본 60초)까지 대기, force:true 옵션으로 강제 제거 가능

다시 추가하려면:

```js
cluster.addInstance('clusteradm@ic-server3:3306')
```

---

## 1-5. 클러스터 해제

클러스터를 완전히 해제하려면:

```js
var cluster = dba.getCluster()
cluster.dissolve()
```

모든 멤버가 제거되고, 메타데이터와 내부 계정이 삭제됩니다. 데이터는 남아있음.

---

## 1-6. 클러스터 모드 변경 (Single/Multi Primary)

### Single → Multi Primary

모든 서버에서 격리수준을 READ-COMMITTED로 변경 후, 아래 명령어 실행:

```sql
SET PERSIST transaction_isolation='READ-COMMITTED';
```

```js
var cluster = dba.getCluster()
cluster.switchToMultiPrimaryMode()
```

### Multi → Single Primary

```js
var cluster = dba.getCluster()
cluster.switchToSinglePrimaryMode('ic-server1:3306')
```

---

# 2. InnoDB Cluster 그룹 복제 모드 상세

- group_replication_single_primary_mode 시스템 변수로 Single/Multi Primary 모드 결정
- Single: 한 서버만 쓰기 가능, 나머지는 읽기 전용
- Multi: 모든 서버가 읽기/쓰기 가능, READ-COMMITTED 권장

---

# 3. InnoDB Cluster 인스턴스 숨기기 (라우팅 제외)

특정 인스턴스를 라우터의 라우팅 대상에서 제외하려면:

```js
var cluster = dba.getCluster()
cluster.setInstanceOption("ic-server3:3306", "tag:_hidden", true)
```

- 기존 연결을 끊으려면 `_disconnect_existing_sessions_when_hidden` 태그 사용
- 다시 라우팅에 포함하려면 false로 변경

```js
cluster.setInstanceOption("ic-server3:3306", "tag:_hidden", false)
```

- 태그 정보는 AdminAPI, SQL 쿼리(`mysql_innodb_cluster_metadata.v2_instances`)로 확인 가능

---

# 4. InnoDB Cluster 라우터 다중화

![InnoDB Cluster 라우터 다중화 예시](/assets/Image/mysqlinnodb/multi-router-instance.png)


## 4-1. 같은 서버에서 라우터 인스턴스 여러 개 구성

- 포트만 다르게 하여 여러 인스턴스 부트스트랩 및 실행
- 각 인스턴스의 mysqlrouter.conf에서 포트, use_gr_notifications 등 설정 변경

## 4-2. 다른 IP로 라우터 인스턴스 추가

- 가상 IP(ifconfig)로 바인딩 후, 부트스트랩 및 conf 파일에서 bind_address, bind_port 수정

## 4-3. 라우터 목록 확인

```js
var cluster = dba.getCluster()
cluster.listRouters()
```

또는 SQL 쿼리로 확인:

```sql
select * from mysql_innodb_cluster_metadata.routers\G;
```

---

# 참고

- 각 단계별 로그, 옵션, 예시, 주의사항을 상세히 기술
- 실제 운영 환경에서의 장애, 복구, 확장, 유지보수 시나리오를 모두 포함 
