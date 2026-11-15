#!/usr/bin/env python3
"""Read-only, privacy-preserving live D1 monitor audit.

Never logs account IDs, names, digests, credentials, SQL values, rows,
transactions, trading items or API responses. Does not mutate D1.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

ORIGIN='https://api.cloudflare.com'
QUERY={
 'status':"""SELECT COUNT(*) AS enabled,
 SUM(CASE WHEN last_success_at>=? THEN 1 ELSE 0 END) AS recently_successful,
 SUM(CASE WHEN encrypted IS NULL THEN 1 ELSE 0 END) AS github_backed,
 SUM(CASE WHEN last_error IS NOT NULL THEN 1 ELSE 0 END) AS warned
 FROM gp_monitor_credentials WHERE enabled=1""",
 'polls':"""SELECT COUNT(*) AS recent_polls,
 COUNT(DISTINCT account_id) AS accounts_observed
 FROM gp_monitor_polls WHERE polled_at>=?""",
 'trades':"""SELECT COUNT(*) AS recent_trades
 FROM gp_monitor_trades WHERE first_observed_at>=?""",
 'events':"""SELECT COUNT(*) AS recent_events
 FROM gp_monitor_events WHERE observed_at>=?""",
 'nights':"""SELECT COUNT(*) AS observed_nights
 FROM gp_monitor_nights WHERE window_end>=?"""
}

def integer(x):
    try:return max(0,int(x or 0))
    except (TypeError,ValueError):raise ValueError('invalid numeric aggregation') from None

def validate_environment(env):
    account=env.get('CF_ACCOUNT_ID','')
    database=env.get('CF_DATABASE_ID','')
    token=env.get('CF_API_TOKEN','')
    if not re.fullmatch(r'[0-9a-fA-F]{32}',account) or not re.fullmatch(r'[0-9a-fA-F-]{32,36}',database) or not token:
        raise ValueError('private audit credentials not configured')
    return account,database,token

def inspect(env=None,transport=None,now=None):
    env=env or os.environ
    account,database,token=validate_environment(env)
    now=int(time.time()*1000) if now is None else now
    transport=transport or urllib.request.urlopen
    url=f'{ORIGIN}/client/v4/accounts/{account}/d1/database/{database}/query'
    values={}
    for name,sql in QUERY.items():
        window=now-(60 if name=='status' else 48*60)*60000
        body=json.dumps({'sql':sql,'params':[str(window)]}).encode()
        req=urllib.request.Request(url,data=body,headers={
            'Authorization':'Bearer '+token,'Content-Type':'application/json',
            'Accept':'application/json'},method='POST')
        with transport(req,timeout=25) as response:
            response_data=json.load(response)
        if not response_data.get('success') or not response_data.get('result') or any(
            item.get('success') is not True for item in response_data['result']):
            raise ValueError('D1 read-only aggregation rejected')
        item=response_data['result'][0]
        if integer(item.get('meta',{}).get('rows_written',0))!=0:
            raise ValueError('read-only query unexpectedly wrote data')
        rows=item.get('results')
        if not isinstance(rows,list) or len(rows)!=1 or not isinstance(rows[0],dict):
            raise ValueError('D1 aggregation malformed')
        values[name]={k:integer(v) for k,v in rows[0].items()}
    enabled=values['status'].get('enabled',0)
    fresh=values['status'].get('recently_successful',0)
    warning=values['status'].get('warned',0)
    recents=values['polls'].get('recent_polls',0)
    status=('BLOCKED_NOT_ENROLLED' if enabled==0 else
      'STALE' if fresh<enabled or recents==0 else
      'PARTIAL_COVERAGE' if warning else 'RECENT_WRITES_VERIFIED')
    return {'schema':'gp-private-readonly-audit-v1','status':status,
      'active_monitors':enabled,'fresh_monitors':fresh,'warned_monitors':warning,
      'recent_poll_count':recents,'accounts_with_recent_polls':values['polls'].get('accounts_observed',0),
      'recent_trade_record_count':values['trades'].get('recent_trades',0),
      'recent_event_count':values['events'].get('recent_events',0),
      'observed_order_nights':values['nights'].get('observed_nights',0),
      'limits':'Counts only. This does not prove a phone was shut, fill attribution, 90-day completeness or forecast calibration.'}

def main():
    try:
        result=inspect()
        print(json.dumps(result,sort_keys=True))
        return 0 if result['status']=='RECENT_WRITES_VERIFIED' else 2
    except (OSError,urllib.error.URLError,ValueError,KeyError,TypeError):
        print('BLOCKED: private D1 live readback could not be independently verified; no account records or credentials were logged.')
        return 2

if __name__=='__main__':
    sys.exit(main())
