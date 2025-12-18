#!/bin/bash
# Script to verify .env.local file exists and has correct format

echo "Checking .env.local file..."
echo "============================"

# Check if file exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file NOT FOUND in current directory"
    echo "Current directory: $(pwd)"
    echo ""
    echo "Please create .env.local in the project root with:"
    echo "  NEXT_PUBLIC_SUPABASE_URL=..."
    echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=..."
    exit 1
fi

echo "✓ .env.local file exists"
echo ""

# Check for required variables
echo "Checking for required variables:"
echo "--------------------------------"

check_var() {
    if grep -q "^${1}=" .env.local; then
        echo "✓ $1 found"
    else
        echo "✗ $1 MISSING"
    fi
}

check_var "NEXT_PUBLIC_SUPABASE_URL"
check_var "NEXT_PUBLIC_SUPABASE_ANON_KEY"
check_var "SUPABASE_SERVICE_ROLE_KEY"
check_var "STRIPE_SECRET_KEY"
check_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"

echo ""
echo "File location: $(pwd)/.env.local"
echo "File size: $(wc -l < .env.local) lines"

