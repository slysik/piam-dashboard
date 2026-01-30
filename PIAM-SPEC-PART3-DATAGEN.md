# PIAM Analytics Demo — Build Specification (Part 3 of 4)
# Data Generation

---

## Task 3.1: Create Python requirements

**File:** `piam-demo/datagen/requirements.txt`

```
faker>=22.0.0
pyyaml>=6.0
clickhouse-connect>=0.7.0
python-dateutil>=2.8.0
numpy>=1.24.0
```

---

## Task 3.2: Create configuration file

**File:** `piam-demo/datagen/config.yaml`

```yaml
# PIAM Demo Data Generation Configuration

general:
  history_days: 30
  random_seed: 42
  output_dir: "../clickhouse/data"

tenants:
  - tenant_id: "acme"
    tenant_name: "Acme Corporate"
    industry: "Professional Services"
    timezone: "America/New_York"
    employee_count: 400
    contractor_count: 20
    contractor_companies: ["TechStaff Inc", "SecureGuard Services"]
    deny_rate_base: 0.025
    suspicious_rate: 0.002
    work_hours_weight: 0.85
    weekend_weight: 0.1
    compliance_issue_rate: 0.03
    sites:
      - site_id: "acme-hq"
        site_name: "Acme HQ Tower"
        site_type: "HQ"
        address: "123 Meeting Street"
        city: "Charleston"
        state: "SC"
        lat: 32.7876
        lon: -79.9403
        buildings:
          - name: "Main Tower"
            floors: [1, 2, 3, 4, 5]
            doors_per_floor: 4
          - name: "Parking Garage"
            floors: [1]
            doors_per_floor: 2
        connectors:
          - connector_id: "acme-lenel-01"
            connector_name: "Lenel Primary"
            pacs_type: "LENEL"
            health_profile: "stable"
      - site_id: "acme-satellite"
        site_name: "Acme Satellite Office"
        site_type: "BRANCH"
        address: "456 Coleman Blvd"
        city: "Mount Pleasant"
        state: "SC"
        lat: 32.8468
        lon: -79.8623
        buildings:
          - name: "Office Building"
            floors: [1, 2]
            doors_per_floor: 3
        connectors:
          - connector_id: "acme-ccure-01"
            connector_name: "C-CURE Satellite"
            pacs_type: "CCURE"
            health_profile: "stable"

  - tenant_id: "buildright"
    tenant_name: "BuildRight Construction"
    industry: "Construction"
    timezone: "America/New_York"
    employee_count: 300
    contractor_count: 150
    contractor_companies: ["Reliable Electric", "Summit Plumbing", "FastFrame Drywall", "ClearView Glass"]
    deny_rate_base: 0.08
    suspicious_rate: 0.005
    work_hours_weight: 0.6
    weekend_weight: 0.3
    compliance_issue_rate: 0.15
    sites:
      - site_id: "br-yard"
        site_name: "BuildRight Main Yard"
        site_type: "WAREHOUSE"
        address: "789 Industrial Way"
        city: "North Charleston"
        state: "SC"
        lat: 32.8546
        lon: -79.9748
        buildings:
          - name: "Main Office"
            floors: [1]
            doors_per_floor: 3
          - name: "Warehouse A"
            floors: [1]
            doors_per_floor: 4
          - name: "Equipment Yard"
            floors: [1]
            doors_per_floor: 2
            zone: "RESTRICTED"
        connectors:
          - connector_id: "br-genetec-01"
            connector_name: "Genetec Primary"
            pacs_type: "GENETEC"
            health_profile: "flaky"
      - site_id: "br-downtown"
        site_name: "Downtown Project Site"
        site_type: "CONSTRUCTION"
        address: "321 King Street"
        city: "Charleston"
        state: "SC"
        lat: 32.7842
        lon: -79.9365
        buildings:
          - name: "Site Entrance"
            floors: [1]
            doors_per_floor: 2
          - name: "Tower Construction"
            floors: [1, 2, 3]
            doors_per_floor: 2
        connectors:
          - connector_id: "br-honeywell-01"
            connector_name: "Honeywell Site"
            pacs_type: "HONEYWELL"
            health_profile: "degraded"

departments:
  corporate: ["Executive", "Finance", "Human Resources", "IT", "Legal", "Marketing", "Operations", "Sales"]
  construction: ["Project Management", "Site Operations", "Safety", "Equipment", "Administration"]

deny_reasons:
  - "INVALID_CREDENTIAL"
  - "EXPIRED_CREDENTIAL"
  - "ACCESS_NOT_GRANTED"
  - "SCHEDULE_VIOLATION"
  - "ANTI_PASSBACK"
  - "CREDENTIAL_SUSPENDED"
  - "UNKNOWN_BADGE"

compliance_requirements:
  - type: "SAFETY_TRAINING"
    name: "General Safety Training"
    validity_days: 365
  - type: "BACKGROUND_CHECK"
    name: "Background Check"
    validity_days: 730
  - type: "SITE_ORIENTATION"
    name: "Site Orientation"
    validity_days: 180
  - type: "NDA"
    name: "Non-Disclosure Agreement"
    validity_days: null
```

---

## Task 3.3: Create main data generator

**File:** `piam-demo/datagen/generate.py`

```python
#!/usr/bin/env python3
"""
PIAM Demo - Synthetic Data Generator
Generates 30 days of realistic PIAM data for 2 tenants.

Usage: python generate.py [--days 30] [--seed 42]
"""

import argparse
import csv
import json
import os
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import yaml
from faker import Faker
import numpy as np

fake = Faker()

def load_config(path="config.yaml"):
    with open(path) as f:
        return yaml.safe_load(f)

def uid():
    return str(uuid.uuid4())[:8]

def write_csv(path, data, fields):
    with open(path, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(data)
    print(f"  {path.name}: {len(data)} rows")

# =============================================================================
# Dimension Generators
# =============================================================================

def gen_tenants(cfg):
    return [{
        'tenant_id': t['tenant_id'],
        'tenant_name': t['tenant_name'],
        'industry': t['industry'],
        'timezone': t['timezone'],
        'created_at': (datetime.now() - timedelta(days=365)).isoformat(timespec='milliseconds')
    } for t in cfg['tenants']]

def gen_sites(cfg):
    sites = []
    for t in cfg['tenants']:
        for s in t['sites']:
            sites.append({
                'site_id': s['site_id'],
                'tenant_id': t['tenant_id'],
                'site_name': s['site_name'],
                'site_type': s['site_type'],
                'address': s['address'],
                'city': s['city'],
                'state': s['state'],
                'country': 'USA',
                'lat': s['lat'],
                'lon': s['lon'],
                'timezone': t['timezone'],
                'created_at': (datetime.now() - timedelta(days=365)).isoformat(timespec='milliseconds')
            })
    return sites

def gen_locations(cfg):
    locs = []
    zones = ['LOBBY', 'OFFICE', 'WAREHOUSE', 'PARKING']
    for t in cfg['tenants']:
        for s in t['sites']:
            for bld in s.get('buildings', []):
                zone = bld.get('zone', random.choice(zones))
                for floor in bld.get('floors', [1]):
                    for d in range(1, bld.get('doors_per_floor', 3) + 1):
                        loc_id = f"{s['site_id']}-{bld['name'][:3].upper()}-F{floor}-D{d}".replace(' ', '')
                        door_type = 'ENTRY' if d == 1 else ('EXIT' if d == bld['doors_per_floor'] else 'BIDIRECTIONAL')
                        if zone == 'RESTRICTED':
                            door_type = 'RESTRICTED'
                        locs.append({
                            'location_id': loc_id,
                            'site_id': s['site_id'],
                            'tenant_id': t['tenant_id'],
                            'location_name': f"{bld['name']} Floor {floor} Door {d}",
                            'location_type': 'DOOR',
                            'door_type': door_type,
                            'building': bld['name'],
                            'floor': floor,
                            'zone': zone,
                            'lat': s['lat'] + random.uniform(-0.001, 0.001),
                            'lon': s['lon'] + random.uniform(-0.001, 0.001),
                            'is_high_risk': 1 if zone == 'RESTRICTED' else 0,
                            'is_emergency_exit': 1 if door_type == 'EXIT' and random.random() < 0.3 else 0,
                            'pacs_controller_id': f"CTRL-{uid()}",
                            'created_at': (datetime.now() - timedelta(days=365)).isoformat(timespec='milliseconds')
                        })
    return locs

def gen_persons(cfg):
    persons = []
    for t in cfg['tenants']:
        tid = t['tenant_id']
        depts = cfg['departments']['construction' if t['industry'] == 'Construction' else 'corporate']
        # Employees
        for i in range(t['employee_count']):
            pid = f"{tid}-EMP-{i+1:04d}"
            hire = fake.date_between(start_date='-5y', end_date='-30d')
            persons.append({
                'person_id': pid, 'tenant_id': tid,
                'badge_id': f"B{random.randint(100000,999999)}",
                'first_name': fake.first_name(), 'last_name': fake.last_name(),
                'email': f"{pid.lower()}@{tid}.com",
                'phone': fake.phone_number() if random.random() < 0.7 else '',
                'department': random.choice(depts),
                'job_title': fake.job()[:50],
                'manager_id': '',
                'person_type': 'EMPLOYEE', 'is_contractor': 0, 'contractor_company': '',
                'hire_date': hire.isoformat(), 'termination_date': '',
                'badge_status': 'ACTIVE', 'last_access': '',
                'created_at': hire.isoformat()
            })
        # Contractors
        companies = t.get('contractor_companies', ['Generic Contractor'])
        for i in range(t['contractor_count']):
            pid = f"{tid}-CON-{i+1:04d}"
            hire = fake.date_between(start_date='-1y', end_date='-7d')
            co = random.choice(companies)
            persons.append({
                'person_id': pid, 'tenant_id': tid,
                'badge_id': f"C{random.randint(100000,999999)}",
                'first_name': fake.first_name(), 'last_name': fake.last_name(),
                'email': f"{fake.user_name()}@{co.lower().replace(' ','')}.com",
                'phone': fake.phone_number() if random.random() < 0.5 else '',
                'department': 'Contractor',
                'job_title': random.choice(['Technician', 'Specialist', 'Worker']),
                'manager_id': '',
                'person_type': 'CONTRACTOR', 'is_contractor': 1, 'contractor_company': co,
                'hire_date': hire.isoformat(), 'termination_date': '',
                'badge_status': 'ACTIVE' if random.random() > 0.05 else 'SUSPENDED',
                'last_access': '', 'created_at': hire.isoformat()
            })
    return persons

def gen_entitlements(cfg, persons, locations):
    ents = []
    locs_by_tenant = {}
    for l in locations:
        locs_by_tenant.setdefault(l['tenant_id'], []).append(l)
    
    for p in persons:
        tid, pid = p['tenant_id'], p['person_id']
        tlocs = locs_by_tenant.get(tid, [])
        if p['is_contractor']:
            accessible = [l for l in tlocs if l['is_high_risk'] == 0]
            n = int(len(accessible) * random.uniform(0.3, 0.6))
            granted = random.sample(accessible, min(n, len(accessible)))
            level, approval, days = 'TEMPORARY', 'MANAGER', random.randint(30, 180)
        else:
            n = int(len(tlocs) * random.uniform(0.6, 0.9))
            granted = random.sample(tlocs, min(n, len(tlocs)))
            level, approval, days = 'STANDARD', 'AUTO', 365
        
        vfrom = datetime.now() - timedelta(days=random.randint(30, 365))
        vuntil = vfrom + timedelta(days=days)
        for l in granted:
            ents.append({
                'entitlement_id': f"ENT-{uid()}", 'tenant_id': tid, 'person_id': pid,
                'location_id': l['location_id'], 'access_level': level,
                'schedule_type': 'BUSINESS_HOURS' if random.random() < 0.7 else 'ALWAYS',
                'valid_from': vfrom.isoformat(timespec='milliseconds'),
                'valid_until': vuntil.isoformat(timespec='milliseconds'),
                'approval_type': approval, 'approved_by': '', 'status': 'ACTIVE',
                'revocation_reason': '',
                'created_at': vfrom.isoformat(timespec='milliseconds'),
                'updated_at': vfrom.isoformat(timespec='milliseconds')
            })
    return ents

# =============================================================================
# Fact Generators
# =============================================================================

def gen_access_events(cfg, persons, locations, entitlements, days):
    events = []
    persons_by_t = {}
    for p in persons:
        persons_by_t.setdefault(p['tenant_id'], []).append(p)
    locs_by_t = {}
    for l in locations:
        locs_by_t.setdefault(l['tenant_id'], []).append(l)
    ent_set = {(e['tenant_id'], e['person_id'], e['location_id']) for e in entitlements}
    
    pacs = ['LENEL', 'CCURE', 'GENETEC', 'HONEYWELL']
    deny_reasons = cfg['deny_reasons']
    now = datetime.now()
    
    for tcfg in cfg['tenants']:
        tid = tcfg['tenant_id']
        deny_rate = tcfg['deny_rate_base']
        susp_rate = tcfg['suspicious_rate']
        work_wt = tcfg['work_hours_weight']
        wknd_wt = tcfg['weekend_weight']
        tpersons = persons_by_t.get(tid, [])
        tlocs = locs_by_t.get(tid, [])
        if not tpersons or not tlocs:
            continue
        
        base_daily = len(tpersons) * 4
        for d in range(days, 0, -1):
            dt = now - timedelta(days=d)
            is_wknd = dt.weekday() >= 5
            daily = int(base_daily * (wknd_wt if is_wknd else 1.0))
            
            for _ in range(daily):
                p = random.choice(tpersons)
                l = random.choice(tlocs)
                # Time
                if random.random() < work_wt and not is_wknd:
                    hr = max(6, min(20, int(random.gauss(12, 3))))
                else:
                    hr = random.randint(0, 23)
                et = dt.replace(hour=hr, minute=random.randint(0,59), second=random.randint(0,59), microsecond=random.randint(0,999999))
                
                # Result
                has_ent = (tid, p['person_id'], l['location_id']) in ent_set
                is_deny = random.random() < (deny_rate * 0.3 if has_ent else 0.85)
                result = 'DENY' if is_deny else 'GRANT'
                deny_rsn = random.choice(deny_reasons) if is_deny else ''
                
                direction = random.choice(['IN', 'OUT', 'IN', 'IN'])
                is_susp = random.random() < susp_rate
                susp_rsn = random.choice(['RAPID_DENY_PATTERN', 'AFTER_HOURS_ACCESS', 'UNUSUAL_LOCATION']) if is_susp else ''
                
                pacs_src = random.choice(pacs)
                payload = json.dumps({
                    "eventType": "ACCESS_ATTEMPT", "timestamp": et.isoformat(),
                    "source": pacs_src,
                    "badge": {"id": p['badge_id'], "facilityCode": random.randint(100,999)},
                    "reader": {"id": l['pacs_controller_id'], "name": l['location_name'], "direction": direction},
                    "result": {"granted": result == 'GRANT', "reason": deny_rsn or "ACCESS_GRANTED"}
                })
                
                events.append({
                    'event_id': f"EVT-{uid()}", 'tenant_id': tid,
                    'event_time': et.isoformat(timespec='milliseconds'),
                    'received_time': (et + timedelta(milliseconds=random.randint(50,200))).isoformat(timespec='milliseconds'),
                    'person_id': p['person_id'], 'badge_id': p['badge_id'],
                    'site_id': l['site_id'], 'location_id': l['location_id'],
                    'direction': direction, 'result': result, 'event_type': 'BADGE_READ',
                    'deny_reason': deny_rsn, 'deny_code': deny_rsn[:3] if deny_rsn else '',
                    'pacs_source': pacs_src, 'pacs_event_id': f"{pacs_src}-{uid()}",
                    'raw_payload': payload,
                    'suspicious_flag': 1 if is_susp else 0, 'suspicious_reason': susp_rsn,
                    'suspicious_score': round(random.uniform(0.7, 0.95), 2) if is_susp else 0,
                    'processed_at': (et + timedelta(seconds=1)).isoformat(timespec='milliseconds')
                })
    
    events.sort(key=lambda x: x['event_time'])
    return events

def gen_connector_health(cfg, days):
    records = []
    now = datetime.now()
    for tcfg in cfg['tenants']:
        tid = tcfg['tenant_id']
        for site in tcfg['sites']:
            for conn in site.get('connectors', []):
                cid = conn['connector_id']
                profile = conn.get('health_profile', 'stable')
                for d in range(days, 0, -1):
                    dt = now - timedelta(days=d)
                    for hr in range(24):
                        for m in [0, 15, 30, 45]:
                            ct = dt.replace(hour=hr, minute=m, second=0, microsecond=0)
                            if profile == 'stable':
                                status, latency = 'HEALTHY', random.randint(20, 80)
                            elif profile == 'degraded':
                                if random.random() < 0.3:
                                    status, latency = 'DEGRADED', random.randint(200, 500)
                                else:
                                    status, latency = 'HEALTHY', random.randint(50, 150)
                            else:  # flaky
                                r = random.random()
                                if r < 0.1:
                                    status, latency = 'DOWN', 0
                                elif r < 0.25:
                                    status, latency = 'DEGRADED', random.randint(300, 800)
                                else:
                                    status, latency = 'HEALTHY', random.randint(30, 120)
                            
                            records.append({
                                'tenant_id': tid, 'connector_id': cid,
                                'connector_name': conn['connector_name'],
                                'pacs_type': conn['pacs_type'],
                                'pacs_version': f"{random.randint(5,8)}.{random.randint(0,9)}",
                                'check_time': ct.isoformat(timespec='milliseconds'),
                                'status': status, 'latency_ms': latency,
                                'events_per_minute': round(random.uniform(5, 50), 1) if status != 'DOWN' else 0,
                                'error_count_1h': random.randint(0, 5) if status == 'DEGRADED' else (random.randint(10, 50) if status == 'DOWN' else 0),
                                'last_event_time': (ct - timedelta(seconds=random.randint(1, 60))).isoformat(timespec='milliseconds') if status != 'DOWN' else '',
                                'error_message': 'Connection timeout' if status == 'DOWN' else ('High latency' if status == 'DEGRADED' else ''),
                                'error_code': 'TIMEOUT' if status == 'DOWN' else ('LATENCY' if status == 'DEGRADED' else ''),
                                'endpoint_url': f"https://{conn['pacs_type'].lower()}.{tid}.local/api",
                                'last_successful_sync': ct.isoformat(timespec='milliseconds') if status == 'HEALTHY' else ''
                            })
    return records

def gen_compliance(cfg, persons):
    records = []
    reqs = cfg['compliance_requirements']
    now = datetime.now()
    for p in persons:
        tid, pid = p['tenant_id'], p['person_id']
        is_con = p['is_contractor']
        tcfg = next((t for t in cfg['tenants'] if t['tenant_id'] == tid), {})
        issue_rate = tcfg.get('compliance_issue_rate', 0.05)
        
        for req in reqs:
            validity = req.get('validity_days')
            issue_dt = fake.date_between(start_date='-2y', end_date='-30d')
            exp_dt = (issue_dt + timedelta(days=validity)) if validity else None
            
            chance = issue_rate if is_con else issue_rate * 0.2
            if exp_dt and exp_dt < now.date():
                status = 'EXPIRED'
            elif exp_dt and exp_dt < (now + timedelta(days=30)).date():
                status = 'EXPIRING_SOON'
            elif random.random() < chance:
                status = random.choice(['NON_COMPLIANT', 'EXPIRED', 'PENDING'])
            else:
                status = 'COMPLIANT'
            
            records.append({
                'tenant_id': tid, 'person_id': pid,
                'requirement_type': req['type'], 'requirement_name': req['name'],
                'status': status,
                'issue_date': issue_dt.isoformat() if issue_dt else '',
                'expiry_date': exp_dt.isoformat() if exp_dt else '',
                'issuing_authority': fake.company()[:50] if random.random() < 0.5 else '',
                'certificate_number': f"CERT-{random.randint(10000,99999)}" if random.random() < 0.5 else '',
                'last_checked': (now - timedelta(hours=random.randint(1, 48))).isoformat(timespec='milliseconds'),
                'checked_by': random.choice(['SYSTEM', 'SYSTEM', 'INTEGRATION']),
                'notes': '', 'evidence_url': ''
            })
    return records

# =============================================================================
# Main
# =============================================================================

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--days', type=int, default=30)
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--config', default='config.yaml')
    args = parser.parse_args()
    
    random.seed(args.seed)
    np.random.seed(args.seed)
    Faker.seed(args.seed)
    
    print(f"Loading config from {args.config}...")
    cfg = load_config(args.config)
    
    out = Path(cfg['general']['output_dir'])
    out.mkdir(parents=True, exist_ok=True)
    print(f"Output: {out}")
    
    print(f"\nGenerating {args.days} days of data...\n")
    
    # Dimensions
    print("Dimensions:")
    tenants = gen_tenants(cfg)
    write_csv(out/'dim_tenant.csv', tenants, ['tenant_id','tenant_name','industry','timezone','created_at'])
    
    sites = gen_sites(cfg)
    write_csv(out/'dim_site.csv', sites, ['site_id','tenant_id','site_name','site_type','address','city','state','country','lat','lon','timezone','created_at'])
    
    locations = gen_locations(cfg)
    write_csv(out/'dim_location.csv', locations, ['location_id','site_id','tenant_id','location_name','location_type','door_type','building','floor','zone','lat','lon','is_high_risk','is_emergency_exit','pacs_controller_id','created_at'])
    
    persons = gen_persons(cfg)
    write_csv(out/'dim_person.csv', persons, ['person_id','tenant_id','badge_id','first_name','last_name','email','phone','department','job_title','manager_id','person_type','is_contractor','contractor_company','hire_date','termination_date','badge_status','last_access','created_at'])
    
    ents = gen_entitlements(cfg, persons, locations)
    write_csv(out/'dim_entitlement.csv', ents, ['entitlement_id','tenant_id','person_id','location_id','access_level','schedule_type','valid_from','valid_until','approval_type','approved_by','status','revocation_reason','created_at','updated_at'])
    
    # Facts
    print("\nFacts:")
    events = gen_access_events(cfg, persons, locations, ents, args.days)
    write_csv(out/'fact_access_events.csv', events, ['event_id','tenant_id','event_time','received_time','person_id','badge_id','site_id','location_id','direction','result','event_type','deny_reason','deny_code','pacs_source','pacs_event_id','raw_payload','suspicious_flag','suspicious_reason','suspicious_score','processed_at'])
    
    health = gen_connector_health(cfg, args.days)
    write_csv(out/'fact_connector_health.csv', health, ['tenant_id','connector_id','connector_name','pacs_type','pacs_version','check_time','status','latency_ms','events_per_minute','error_count_1h','last_event_time','error_message','error_code','endpoint_url','last_successful_sync'])
    
    compliance = gen_compliance(cfg, persons)
    write_csv(out/'fact_compliance_status.csv', compliance, ['tenant_id','person_id','requirement_type','requirement_name','status','issue_date','expiry_date','issuing_authority','certificate_number','last_checked','checked_by','notes','evidence_url'])
    
    print("\n" + "="*50)
    print("Summary:")
    print(f"  Tenants:      {len(tenants)}")
    print(f"  Sites:        {len(sites)}")
    print(f"  Locations:    {len(locations)}")
    print(f"  Persons:      {len(persons)}")
    print(f"  Entitlements: {len(ents)}")
    print(f"  Events:       {len(events)}")
    print(f"  Health:       {len(health)}")
    print(f"  Compliance:   {len(compliance)}")
    print("="*50)

if __name__ == '__main__':
    main()
```

---

## Task 3.4: Create live event trickle generator

**File:** `piam-demo/datagen/trickle.py`

```python
#!/usr/bin/env python3
"""
PIAM Demo - Live Event Trickle Generator
Continuously inserts access events into ClickHouse.

Usage: python trickle.py [--interval 5] [--events-per-batch 3]
"""

import argparse
import json
import random
import time
import uuid
from datetime import datetime, timedelta

import yaml
import clickhouse_connect

def load_config(path="config.yaml"):
    with open(path) as f:
        return yaml.safe_load(f)

def uid():
    return str(uuid.uuid4())[:8]

def get_client():
    return clickhouse_connect.get_client(host='localhost', port=8123, database='piam')

def fetch_refs(client):
    persons = client.query("SELECT tenant_id, person_id, badge_id FROM dim_person WHERE badge_status='ACTIVE'").result_rows
    locations = client.query("SELECT tenant_id, site_id, location_id, location_name, pacs_controller_id FROM dim_location").result_rows
    return {'persons': persons, 'locations': locations}

def gen_event(refs, cfg):
    p = random.choice(refs['persons'])
    tid = p[0]
    tlocs = [l for l in refs['locations'] if l[0] == tid]
    if not tlocs:
        tlocs = refs['locations']
    l = random.choice(tlocs)
    
    now = datetime.now()
    tcfg = next((t for t in cfg['tenants'] if t['tenant_id'] == tid), {})
    deny_rate = tcfg.get('deny_rate_base', 0.05)
    susp_rate = tcfg.get('suspicious_rate', 0.002)
    
    is_deny = random.random() < deny_rate
    is_susp = random.random() < susp_rate
    result = 'DENY' if is_deny else 'GRANT'
    direction = random.choice(['IN', 'OUT', 'IN', 'IN'])
    pacs = random.choice(['LENEL', 'CCURE', 'GENETEC', 'HONEYWELL'])
    deny_reasons = cfg.get('deny_reasons', ['INVALID_CREDENTIAL', 'ACCESS_NOT_GRANTED'])
    deny_rsn = random.choice(deny_reasons) if is_deny else ''
    susp_rsn = random.choice(['RAPID_DENY_PATTERN', 'AFTER_HOURS_ACCESS']) if is_susp else ''
    
    payload = json.dumps({
        "eventType": "ACCESS_ATTEMPT", "timestamp": now.isoformat(), "source": pacs,
        "badge": {"id": p[2], "facilityCode": random.randint(100, 999)},
        "reader": {"id": l[4], "name": l[3], "direction": direction},
        "result": {"granted": result == 'GRANT', "reason": deny_rsn or "ACCESS_GRANTED"}
    })
    
    return {
        'event_id': f"EVT-{uid()}", 'tenant_id': tid,
        'event_time': now.isoformat(timespec='milliseconds'),
        'received_time': (now + timedelta(milliseconds=random.randint(50, 200))).isoformat(timespec='milliseconds'),
        'person_id': p[1], 'badge_id': p[2],
        'site_id': l[1], 'location_id': l[2],
        'direction': direction, 'result': result, 'event_type': 'BADGE_READ',
        'deny_reason': deny_rsn, 'deny_code': deny_rsn[:3] if deny_rsn else '',
        'pacs_source': pacs, 'pacs_event_id': f"{pacs}-{uid()}",
        'raw_payload': payload,
        'suspicious_flag': 1 if is_susp else 0, 'suspicious_reason': susp_rsn,
        'suspicious_score': round(random.uniform(0.7, 0.95), 2) if is_susp else 0,
        'processed_at': (now + timedelta(seconds=1)).isoformat(timespec='milliseconds')
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--interval', type=float, default=5)
    parser.add_argument('--events-per-batch', type=int, default=3)
    args = parser.parse_args()
    
    cfg = load_config()
    client = get_client()
    refs = fetch_refs(client)
    print(f"Loaded {len(refs['persons'])} persons, {len(refs['locations'])} locations")
    print(f"Trickling {args.events_per_batch} events every {args.interval}s. Ctrl+C to stop.\n")
    
    cols = ['event_id','tenant_id','event_time','received_time','person_id','badge_id',
            'site_id','location_id','direction','result','event_type','deny_reason',
            'deny_code','pacs_source','pacs_event_id','raw_payload','suspicious_flag',
            'suspicious_reason','suspicious_score','processed_at']
    
    count = 0
    try:
        while True:
            events = [gen_event(refs, cfg) for _ in range(args.events_per_batch)]
            rows = [[e[c] for c in cols] for e in events]
            client.insert('fact_access_events', rows, column_names=cols)
            count += len(events)
            
            results = [e['result'] for e in events]
            print(f"[{datetime.now().strftime('%H:%M:%S')}] +{len(events)} (G:{results.count('GRANT')} D:{results.count('DENY')}) Total: {count}")
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print(f"\nStopped. Total: {count}")

if __name__ == '__main__':
    main()
```

---

## Task 3.5: Create incident replay generator

**File:** `piam-demo/datagen/replay.py`

```python
#!/usr/bin/env python3
"""
PIAM Demo - Incident Replay Window Generator
Injects a deterministic 30-minute window with guaranteed incidents.

Usage: python replay.py
"""

import json
import random
import uuid
from datetime import datetime, timedelta

import yaml
import clickhouse_connect

def load_config(path="config.yaml"):
    with open(path) as f:
        return yaml.safe_load(f)

def uid():
    return str(uuid.uuid4())[:8]

def get_client():
    return clickhouse_connect.get_client(host='localhost', port=8123, database='piam')

def main():
    cfg = load_config()
    client = get_client()
    
    # Get a location for the spike
    loc = client.query("SELECT tenant_id, site_id, location_id, location_name, pacs_controller_id FROM dim_location WHERE tenant_id='acme' LIMIT 1").result_rows[0]
    persons = client.query("SELECT tenant_id, person_id, badge_id FROM dim_person WHERE tenant_id='acme' AND badge_status='ACTIVE' LIMIT 20").result_rows
    
    now = datetime.now()
    events = []
    cols = ['event_id','tenant_id','event_time','received_time','person_id','badge_id',
            'site_id','location_id','direction','result','event_type','deny_reason',
            'deny_code','pacs_source','pacs_event_id','raw_payload','suspicious_flag',
            'suspicious_reason','suspicious_score','processed_at']
    
    # 1. Deny spike: 20 denies in 10 minutes at one door
    print("Generating deny spike...")
    for i in range(20):
        p = random.choice(persons)
        et = now - timedelta(minutes=random.randint(5, 15))
        payload = json.dumps({"eventType": "ACCESS_ATTEMPT", "timestamp": et.isoformat(), "result": {"granted": False, "reason": "ACCESS_NOT_GRANTED"}})
        events.append({
            'event_id': f"REPLAY-{uid()}", 'tenant_id': loc[0],
            'event_time': et.isoformat(timespec='milliseconds'),
            'received_time': et.isoformat(timespec='milliseconds'),
            'person_id': p[1], 'badge_id': p[2],
            'site_id': loc[1], 'location_id': loc[2],
            'direction': 'IN', 'result': 'DENY', 'event_type': 'BADGE_READ',
            'deny_reason': 'ACCESS_NOT_GRANTED', 'deny_code': 'ACC',
            'pacs_source': 'LENEL', 'pacs_event_id': f"LENEL-{uid()}",
            'raw_payload': payload,
            'suspicious_flag': 1 if i > 15 else 0,
            'suspicious_reason': 'RAPID_DENY_PATTERN' if i > 15 else '',
            'suspicious_score': 0.85 if i > 15 else 0,
            'processed_at': et.isoformat(timespec='milliseconds')
        })
    
    # 2. Suspicious cluster: 5 rapid denies by same badge
    print("Generating suspicious cluster...")
    p = persons[0]
    for i in range(5):
        et = now - timedelta(minutes=8, seconds=i*30)
        payload = json.dumps({"eventType": "ACCESS_ATTEMPT", "timestamp": et.isoformat(), "result": {"granted": False, "reason": "ANTI_PASSBACK"}})
        events.append({
            'event_id': f"REPLAY-{uid()}", 'tenant_id': loc[0],
            'event_time': et.isoformat(timespec='milliseconds'),
            'received_time': et.isoformat(timespec='milliseconds'),
            'person_id': p[1], 'badge_id': p[2],
            'site_id': loc[1], 'location_id': loc[2],
            'direction': 'IN', 'result': 'DENY', 'event_type': 'BADGE_READ',
            'deny_reason': 'ANTI_PASSBACK', 'deny_code': 'ANT',
            'pacs_source': 'LENEL', 'pacs_event_id': f"LENEL-{uid()}",
            'raw_payload': payload,
            'suspicious_flag': 1, 'suspicious_reason': 'RAPID_DENY_PATTERN',
            'suspicious_score': 0.92,
            'processed_at': et.isoformat(timespec='milliseconds')
        })
    
    # Insert events
    rows = [[e[c] for c in cols] for e in events]
    client.insert('fact_access_events', rows, column_names=cols)
    print(f"Inserted {len(events)} replay events")
    
    # 3. Connector degradation
    print("Generating connector degradation...")
    conn_cols = ['tenant_id','connector_id','connector_name','pacs_type','pacs_version',
                 'check_time','status','latency_ms','events_per_minute','error_count_1h',
                 'last_event_time','error_message','error_code','endpoint_url','last_successful_sync']
    conn_rows = []
    for i in range(6):
        ct = now - timedelta(minutes=i*5)
        conn_rows.append([
            'acme', 'acme-lenel-01', 'Lenel Primary', 'LENEL', '7.2',
            ct.isoformat(timespec='milliseconds'),
            'DEGRADED' if i < 4 else 'HEALTHY',
            450 if i < 4 else 65,
            15.2, 12 if i < 4 else 0,
            (ct - timedelta(seconds=30)).isoformat(timespec='milliseconds'),
            'High latency detected' if i < 4 else '',
            'LATENCY' if i < 4 else '',
            'https://lenel.acme.local/api',
            ct.isoformat(timespec='milliseconds') if i >= 4 else ''
        ])
    client.insert('fact_connector_health', conn_rows, column_names=conn_cols)
    print(f"Inserted {len(conn_rows)} connector health records")
    
    print("\n" + "="*50)
    print("Replay window loaded!")
    print("Filter dashboards to last 30 minutes to see incidents.")
    print("="*50)

if __name__ == '__main__':
    main()
```

---

## Acceptance Criteria (Part 3)

1. **Dependencies install:**
   ```bash
   cd datagen && pip install -r requirements.txt
   ```

2. **Config is valid:**
   ```bash
   python -c "import yaml; yaml.safe_load(open('config.yaml'))"
   ```

3. **Generator runs:**
   ```bash
   python generate.py --days 30
   # Should create CSV files in ../clickhouse/data/
   ```

4. **Data loads:**
   ```bash
   make generate
   make shell-ch
   SELECT count() FROM fact_access_events;
   # Should return ~100,000+ rows
   ```

5. **Trickle works:**
   ```bash
   make trickle
   # Should insert events every 5 seconds
   ```

6. **Replay works:**
   ```bash
   make replay
   # Should insert incident events
   ```

---

**Next:** Continue to Part 4 (Superset Dashboards + Vercel Backup)
