#!/usr/bin/env bash
# Smoke test for the validation layer. Start the server first (npm run dev),
# then run: npm run smoke
#
# NOTE: mutates product 1's quantity. Run `npm run seed` afterwards to reset.

BASE=${BASE:-http://localhost:3000}
pass=0; fail=0

check() {
    local desc="$1" want="$2"; shift 2
    local out code body
    out=$(curl -s -m 5 -w $'\n%{http_code}' "$@" 2>/dev/null) || {
        printf '  FAIL  %-50s (could not connect)\n' "$desc"; fail=$((fail+1)); return
    }
    code=$(printf '%s' "$out" | tail -n1)
    body=$(printf '%s' "$out" | sed '$d')
    if [ "$code" = "$want" ]; then
        printf '  ok    %-50s %s\n' "$desc" "$code"; pass=$((pass+1))
    else
        printf '  FAIL  %-50s got %s, want %s\n' "$desc" "$code" "$want"
        printf '        %s\n' "$(printf '%s' "$body" | head -c 180)"
        fail=$((fail+1))
    fi
}


echo
echo "smoke: $BASE"
echo

echo "-- infrastructure"
check "health"                        200 "$BASE/api/health"
check "unknown route returns JSON 404" 404 "$BASE/api/nope"

echo
echo "-- params are coerced and checked"
check "GET /categories/1"             200 "$BASE/api/categories/1"
check "GET /categories/abc"           400 "$BASE/api/categories/abc"
check "GET /categories/-1"            400 "$BASE/api/categories/-1"
check "GET /categories/999999"        404 "$BASE/api/categories/999999"
check "GET /products/abc"             400 "$BASE/api/products/abc"
check "GET /warehouses/abc"           400 "$BASE/api/warehouses/abc"

echo
echo "-- body validation"
check "POST /categories typo'd key"   400 -X POST -H 'Content-Type: application/json' -d '{"nmae":"Tools"}'      "$BASE/api/categories"
check "POST /categories empty body"   400 -X POST -H 'Content-Type: application/json' -d '{}'                    "$BASE/api/categories"
check "POST /categories blank name"   400 -X POST -H 'Content-Type: application/json' -d '{"name":"   "}'        "$BASE/api/categories"
check "POST /categories wrong type"   400 -X POST -H 'Content-Type: application/json' -d '{"name":12345}'        "$BASE/api/categories"
check "POST /categories malformed"    400 -X POST -H 'Content-Type: application/json' -d '{"name":'              "$BASE/api/categories"
check "PATCH /categories/1 empty"     400 -X PATCH -H 'Content-Type: application/json' -d '{}'                   "$BASE/api/categories/1"

echo
echo "-- query validation"
check "GET /categories?limit=2"       200 "$BASE/api/categories?limit=2"
check "GET /categories?limit=5000"    400 "$BASE/api/categories?limit=5000"
check "GET /categories?page=abc"      400 "$BASE/api/categories?page=abc"

echo
echo "-- stock movements: shape vs state"
check "IN quantity 0 rejected"        400 -X POST -H 'Content-Type: application/json' -d '{"productId":1,"type":"IN","quantity":0}'        "$BASE/api/stock-movements"
check "bad movement type rejected"    400 -X POST -H 'Content-Type: application/json' -d '{"productId":1,"type":"NOPE","quantity":5}'      "$BASE/api/stock-movements"
check "missing productId rejected"    400 -X POST -H 'Content-Type: application/json' -d '{"type":"IN","quantity":5}'                      "$BASE/api/stock-movements"
check "IN 5 accepted"                 201 -X POST -H 'Content-Type: application/json' -d '{"productId":1,"type":"IN","quantity":5}'        "$BASE/api/stock-movements"
check "ADJUST 0 accepted"             201 -X POST -H 'Content-Type: application/json' -d '{"productId":1,"type":"ADJUST","quantity":0}'    "$BASE/api/stock-movements"
check "OUT beyond stock -> 409"       409 -X POST -H 'Content-Type: application/json' -d '{"productId":1,"type":"OUT","quantity":999999}'  "$BASE/api/stock-movements"
check "movement on missing product"   404 -X POST -H 'Content-Type: application/json' -d '{"productId":999999,"type":"IN","quantity":1}'   "$BASE/api/stock-movements"

echo
echo "  $pass passed, $fail failed"
echo
[ "$fail" -eq 0 ]
