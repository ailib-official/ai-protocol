#!/bin/bash

# AI-Protocol Configuration Validation Script
# Validates all YAML configuration files against JSON schemas

set -e

echo "🔍 AI-Protocol Configuration Validator"
echo "======================================"

# Check if required tools are installed
command -v ajv >/dev/null 2>&1 || {
    echo "❌ ajv-cli is required. Install with: npm install -g ajv-cli"
    exit 1
}

command -v yamllint >/dev/null 2>&1 || {
    echo "⚠️  yamllint not found. Install with: pip install yamllint"
    YAMLLINT=false
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation results
PASSED=0
FAILED=0

# Function to validate a single file
validate_file() {
    local file="$1"
    local schema="$2"

    echo -n "Validating $file... "

    if ajv validate -s "$schema" -d "$file" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        ajv validate -s "$schema" -d "$file"
        ((FAILED++))
    fi
}

# Function to lint YAML files
lint_yaml() {
    local file="$1"

    if [ "$YAMLLINT" != "false" ]; then
        echo -n "Linting $file... "
        if yamllint "$file" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ PASSED${NC}"
        else
            echo -e "${YELLOW}⚠️  WARNING${NC}"
            yamllint "$file" || true
        fi
    fi
}

echo ""
echo "📋 Validating v1 provider configurations..."
echo "-------------------------------------------"

# Validate v1 providers
for provider_file in v1/providers/*.yaml; do
    if [ -f "$provider_file" ]; then
        validate_file "$provider_file" "schemas/v1.json"
        lint_yaml "$provider_file"
    fi
done

echo ""
echo "📋 Validating v1 model configurations..."
echo "----------------------------------------"

# Validate v1 models
for model_file in v1/models/*.yaml; do
    if [ -f "$model_file" ]; then
        # Models use the same schema as providers for now
        validate_file "$model_file" "schemas/v1.json"
        lint_yaml "$model_file"
    fi
done

echo ""
echo "📋 Validating example configurations..."
echo "---------------------------------------"

# Validate examples
for example_file in examples/*.yaml; do
    if [ -f "$example_file" ]; then
        validate_file "$example_file" "schemas/v1.json"
        lint_yaml "$example_file"
    fi
done

echo ""
echo "📋 Validating specification files..."
echo "-------------------------------------"

# Validate spec files (basic YAML syntax check)
for spec_file in v1/spec.yaml v2-alpha/spec.yaml; do
    if [ -f "$spec_file" ]; then
        lint_yaml "$spec_file"
    fi
done

echo ""
echo "📊 Validation Summary"
echo "====================="
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All validations passed!${NC}"
    exit 0
else
    echo -e "${RED}💥 Some validations failed. Please fix the errors above.${NC}"
    exit 1
fi
