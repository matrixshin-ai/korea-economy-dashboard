#!/bin/bash

# 자동 Git 설정 및 GitHub 푸시 스크립트

echo "🚀 자동 배포 시작..."

# Git 사용자 정보 설정
echo "📝 Git 사용자 정보 설정 중..."
git config --global user.email "matrixshin@example.com"
git config --global user.name "Minsik Shin"

# 커밋
echo "💾 커밋 중..."
git commit -m "Initial commit for Railway deployment"

# Remote 추가 (이미 있으면 무시)
echo "🔗 GitHub 연결 중..."
git remote remove origin 2>/dev/null
git remote add origin https://github.com/matrixshin-ai/korea-economy-dashboard.git

# 브랜치 이름 변경
echo "🌿 브랜치 설정 중..."
git branch -M main

# GitHub에 푸시
echo "⬆️  GitHub에 업로드 중..."
git push -u origin main --force

echo "✅ 완료! GitHub에 업로드되었습니다!"
echo "🌐 https://github.com/matrixshin-ai/korea-economy-dashboard"
echo ""
echo "다음 단계: Railway 대시보드로 가서 이 리포지토리를 선택하세요!"
