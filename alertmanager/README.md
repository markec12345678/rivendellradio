# Rock 88.7 Alerting Stack

This directory plus `../prometheus/alerts.yml` define the three-tier alerting stack for the Rock 88.7 Broadcast Control Center: **Prometheus** scrapes `/api/v1/metrics` and evaluates the rules in `alerts.yml`; firing alerts are pushed to **Alertmanager** (`alertmanager.yml`), which groups, dedupes, inhibits, and routes them through the receivers listed below; templates in `templates.tmpl` shape the Slack / email / PagerDuty payloads. Routing logic: `category=eas` → `eas-team` (everywhere — emergency broadcast overrides); `category=security` → `security-team`; `severity=critical` → PagerDuty + `#rock887-alerts-critical`; `severity=warning` → Slack `#rock887-alerts` + email digest; everything else falls through to `default-warning`. A single `SilenceAlarm` (dead air) CRITICAL inhibits all WARNING-level broadcast-service alerts so a single root cause doesn't spam the channel. Validate with `amtool check-config alertmanager.yml` and `promtool check rules ../prometheus/alerts.yml` before deploying.

## Adding a new PagerDuty integration

1. In PagerDuty → **Services → Service Directory → New Service**, name it (e.g. `Rock887 On-Air`) and assign an **Escalation Policy** (e.g. Broadcast Engineer → Engineering Manager → Station Manager).
2. Open the new service → **Integrations → Add Integration** → choose **Events API v2**. Copy the **Integration Key** (32-char hex).
3. In `alertmanager.yml`, find the receiver you want to wire (e.g. `critical-pagerduty` or `security-team`) and replace the `routing_key: 'CHANGE_ME_PAGERDUTY_ROUTING_KEY_*'` placeholder with the integration key. If you're adding a brand-new receiver, copy the `pagerduty_configs` block, give it a unique `component` and `group`, then add a `route` entry pointing to the new receiver.
4. Reload Alertmanager (`POST /-/reload` or `docker compose restart alertmanager`) and send a test alert: `amtool alert add alertname=TestPD severity=critical service=test --annotation=summary="PagerDuty routing test"`.

## Adding a new Slack integration

1. Go to <https://api.slack.com/apps> → **Create New App** → **From scratch**. Name it `Rock887 Alerts`, pick the workspace.
2. **Incoming Webhooks** → toggle **On** → **Add New Webhook to Workspace** → pick the channel (e.g. `#rock887-alerts-critical`). Copy the webhook URL (`https://hooks.slack.com/services/T…/B…/…`).
3. In `alertmanager.yml`, set `global.slack_api_url` to that URL (or use `--config.expand-env=external_url` and `${SLACK_API_URL}` to keep it out of git). In each `slack_configs` block, set `channel:` to the target channel (`#rock887-alerts`, `#rock887-alerts-critical`, `#rock887-security`, or `#rock887-eas`).
4. Reload Alertmanager and verify with: `amtool alert add alertname=TestSlack severity=warning service=test --annotation=summary="Slack routing test"`. The Slack message format comes from `templates.tmpl` (`rock887.title`, `rock887.description`).
