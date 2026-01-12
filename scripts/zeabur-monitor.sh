#!/bin/bash

# Zeabur 部署监控脚本
# AI督学 - 小影老师

API_KEY="sk-kmmwgm5hff73ywldk3uhjxthhsbtd"
SERVICE_ID="69645f0026bd3e8668a3dfa8"
ENV_ID="6963f3eba7aaff0c1152bb59"
DOMAIN="https://iduxue.zeabur.app"

echo "🔍 AI督学 - Zeabur 部署监控"
echo "================================"

# 获取服务状态
echo ""
echo "📊 服务信息:"
curl -s --max-time 10 -X POST "https://api.zeabur.com/graphql" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"query { service(_id: \\\"$SERVICE_ID\\\") { _id name domains { domain } gitTrigger(environmentID: \\\"$ENV_ID\\\") { repoURL } } }\"
  }" | jq -r '.data.service | "  名称: \(.name)\n  域名: \(.domains[0].domain)\n  仓库: \(.gitTrigger.repoURL)"'

# 获取最新部署状态
echo ""
echo "🚀 最新部署:"
DEPLOYMENT=$(curl -s --max-time 10 -X POST "https://api.zeabur.com/graphql" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"query { service(_id: \\\"$SERVICE_ID\\\") { deployments(environmentID: \\\"$ENV_ID\\\", limit: 1) { items { _id status createdAt } } } }\"
  }")

echo "$DEPLOYMENT" | jq -r '.data.service.deployments.items[0] | "  ID: \(._id)\n  状态: \(.status)\n  时间: \(.createdAt)"'

# 检查网站是否可访问
echo ""
echo "🌐 网站检查:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN")
if [ "$HTTP_CODE" = "200" ]; then
  echo "  状态: ✅ 正常 (HTTP $HTTP_CODE)"
else
  echo "  状态: ❌ 异常 (HTTP $HTTP_CODE)"
fi

echo ""
echo "================================"
echo "🔗 访问地址: $DOMAIN"
echo "📦 GitHub: https://github.com/MagicalAci/AI-Inspector"

