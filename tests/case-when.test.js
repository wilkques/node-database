/**
 * CASE WHEN Expression Tests
 * Tests for function-based and value-based CASE WHEN functionality
 */

import { jest } from "@jest/globals";
import Builder from "../dist/lib/queries/Builder.js";
import MySQL from "../dist/lib/queries/grammar/MySQL.js";

describe("CASE WHEN Expressions", () => {
    let builder;
    let grammar;

    beforeEach(() => {
        grammar = new MySQL();
        builder = new Builder(null, grammar);
    });

    describe("Simple CASE (column-based)", () => {
        test("should create simple CASE with column and values", () => {
            const caseExpr = builder.case('status')
                .when('active', 'Active User')
                .when('inactive', 'Inactive User')
                .else('Unknown')
                .end();

            expect(caseExpr.type).toBe('raw');
            expect(caseExpr.raw).toBe(true);
            expect(caseExpr.value).toBe('CASE status WHEN ? THEN ? WHEN ? THEN ? ELSE ? END');
            expect(caseExpr.bindings).toEqual(['active', 'Active User', 'inactive', 'Inactive User', 'Unknown']);
        });

        test("should create simple CASE with alias", () => {
            const caseExpr = builder.case('priority')
                .when('high', 'High Priority')
                .when('low', 'Low Priority')
                .end('priority_text');

            expect(caseExpr.value).toBe('CASE priority WHEN ? THEN ? WHEN ? THEN ? END as priority_text');
            expect(caseExpr.bindings).toEqual(['high', 'High Priority', 'low', 'Low Priority']);
        });

        test("should handle case without ELSE clause", () => {
            const caseExpr = builder.case('status')
                .when('active', 'Active')
                .end();

            expect(caseExpr.value).toBe('CASE status WHEN ? THEN ? END');
            expect(caseExpr.bindings).toEqual(['active', 'Active']);
        });
    });

    describe("Searched CASE (condition-based)", () => {
        test("should create searched CASE without column", () => {
            const caseExpr = builder.case()
                .when('total > 1000', 'Large Order')
                .when('total > 500', 'Medium Order')
                .else('Small Order')
                .end();

            expect(caseExpr.value).toBe('CASE WHEN total > 1000 THEN ? WHEN total > 500 THEN ? ELSE ? END');
            expect(caseExpr.bindings).toEqual(['Large Order', 'Medium Order', 'Small Order']);
        });

        test("should handle complex conditions", () => {
            const caseExpr = builder.case()
                .when('status = "active" AND created_at > "2024-01-01"', 'Recent Active')
                .when('status = "inactive"', 'Inactive')
                .else('Other')
                .end();

            expect(caseExpr.value).toBe('CASE WHEN status = "active" AND created_at > "2024-01-01" THEN ? WHEN status = "inactive" THEN ? ELSE ? END');
            expect(caseExpr.bindings).toEqual(['Recent Active', 'Inactive', 'Other']);
        });
    });

    describe("Function-based CASE (parameter binding)", () => {
        test("should create CASE with function-based WHERE conditions", () => {
            const caseExpr = builder.case('id')
                .when(query => {
                    query.whereIn('id', [123, 456]);
                }, 'Active')
                .else('Inactive')
                .end();

            expect(caseExpr.type).toBe('raw');
            expect(caseExpr.raw).toBe(true);
            expect(caseExpr.value).toBe('CASE WHEN `id` IN (?, ?) THEN ? ELSE ? END');
            expect(caseExpr.bindings).toEqual([123, 456, 'Active', 'Inactive']);
        });

        test("should handle multiple function-based conditions", () => {
            const caseExpr = builder.case('priority')
                .when(query => {
                    query.whereIn('id', [1, 2, 3]);
                }, 'High')
                .when(query => {
                    query.where('level', '>', 5);
                }, 'VIP')
                .else('Normal')
                .end();

            expect(caseExpr.value).toBe('CASE WHEN `id` IN (?, ?, ?) THEN ? WHEN `level` > ? THEN ? ELSE ? END');
            expect(caseExpr.bindings).toEqual([1, 2, 3, 'High', 5, 'VIP', 'Normal']);
        });

        test("should handle complex WHERE conditions in functions", () => {
            const caseExpr = builder.case('status')
                .when(query => {
                    query.where('active', true).where('created_at', '>', '2024-01-01');
                }, 'Recent Active')
                .else('Other')
                .end();

            expect(caseExpr.value).toBe('CASE WHEN `active` = ? AND `created_at` > ? THEN ? ELSE ? END');
            expect(caseExpr.bindings).toEqual([true, '2024-01-01', 'Recent Active', 'Other']);
        });
    });

    describe("Function-based CASE (subquery)", () => {
        test("should create CASE with subquery conditions", () => {
            const caseExpr = builder.case('id')
                .when(query => {
                    query.select('id').from('ActiveUsers').where('status', 'active');
                }, 'Active')
                .else('Inactive')
                .end();

            expect(caseExpr.type).toBe('raw');
            expect(caseExpr.raw).toBe(true);
            expect(caseExpr.value).toBe('CASE WHEN id IN (SELECT `id` FROM `ActiveUsers` WHERE `status` = ?) THEN ? ELSE ? END');
            expect(caseExpr.bindings).toEqual(['active', 'Active', 'Inactive']);
        });

        test("should handle complex subqueries", () => {
            const caseExpr = builder.case('user_id')
                .when(query => {
                    query.select('user_id')
                        .from('VipUsers')
                        .where('level', '>', 5)
                        .where('active', true);
                }, 'VIP')
                .else('Regular')
                .end();

            expect(caseExpr.value).toBe('CASE WHEN user_id IN (SELECT `user_id` FROM `VipUsers` WHERE `level` > ? AND `active` = ?) THEN ? ELSE ? END');
            expect(caseExpr.bindings).toEqual([5, true, 'VIP', 'Regular']);
        });

        test("should handle subqueries with joins", () => {
            const caseExpr = builder.case('order_id')
                .when(query => {
                    query.select('o.id')
                        .from('orders o')
                        .leftJoin('customers c', 'o.customer_id', 'c.id')
                        .where('c.vip_level', '>', 3);
                }, 'VIP Order')
                .else('Regular Order')
                .end();

            expect(caseExpr.value).toContain('CASE WHEN order_id IN (SELECT');
            expect(caseExpr.value).toContain('FROM `orders o`');
            expect(caseExpr.value).toContain('LEFT JOIN `customers c`');
            expect(caseExpr.bindings).toEqual([3, 'VIP Order', 'Regular Order']);
        });
    });

    describe("Mixed CASE expressions", () => {
        test("should handle mixed parameter binding and subquery forms", () => {
            const caseExpr = builder.case('priority')
                .when(query => {
                    // Parameter binding form
                    query.whereIn('id', [1, 2, 3]);
                }, 'High')
                .when(query => {
                    // Subquery form
                    query.select('user_id').from('VipUsers').where('level', '>', 5);
                }, 'VIP')
                .else('Normal')
                .end();

            expect(caseExpr.value).toBe('CASE WHEN `id` IN (?, ?, ?) THEN ? WHEN priority IN (SELECT `user_id` FROM `VipUsers` WHERE `level` > ?) THEN ? ELSE ? END');
            expect(caseExpr.bindings).toEqual([1, 2, 3, 'High', 5, 'VIP', 'Normal']);
        });

        test("should handle multiple subquery conditions", () => {
            const caseExpr = builder.case('user_id')
                .when(query => {
                    query.select('id').from('AdminUsers');
                }, 'Admin')
                .when(query => {
                    query.select('user_id').from('VipUsers').where('active', true);
                }, 'VIP')
                .else('Regular')
                .end();

            expect(caseExpr.value).toBe('CASE WHEN user_id IN (SELECT `id` FROM `AdminUsers`) THEN ? WHEN user_id IN (SELECT `user_id` FROM `VipUsers` WHERE `active` = ?) THEN ? ELSE ? END');
            expect(caseExpr.bindings).toEqual(['Admin', true, 'VIP', 'Regular']);
        });
    });

    describe("CASE in UPDATE statements", () => {
        test("should work in UPDATE with parameter binding", () => {
            const updateBuilder = new Builder(null, grammar);
            const updateQuery = updateBuilder.table('users').whereIn('id', [1, 2, 3]);

            const caseExpr = builder.case('id')
                .when(query => query.whereIn('id', [1, 2]), 'Active')
                .else('Inactive')
                .end();

            const sql = updateQuery.grammar.compileUpdate(updateQuery, { status: caseExpr });
            const bindings = updateQuery.getUpdateBindings({ status: caseExpr });

            expect(sql).toBe('UPDATE `users` SET `status` = CASE WHEN `id` IN (?, ?) THEN ? ELSE ? END WHERE `id` IN (?, ?, ?)');
            expect(bindings).toEqual([1, 2, 'Active', 'Inactive', 1, 2, 3]);
        });

        test("should work in UPDATE with subquery", () => {
            const updateBuilder = new Builder(null, grammar);
            const updateQuery = updateBuilder.table('users').where('active', true);

            const caseExpr = builder.case('id')
                .when(query => {
                    query.select('user_id').from('VipUsers').where('level', '>', 5);
                }, 'VIP')
                .else('Regular')
                .end();

            const sql = updateQuery.grammar.compileUpdate(updateQuery, { status: caseExpr });
            const bindings = updateQuery.getUpdateBindings({ status: caseExpr });

            expect(sql).toContain('UPDATE `users` SET `status` = CASE WHEN id IN (SELECT `user_id` FROM `VipUsers` WHERE `level` > ?) THEN ? ELSE ? END');
            expect(bindings).toEqual([5, 'VIP', 'Regular', true]);
        });
    });

    describe("Edge cases and error handling", () => {
        test("should handle empty CASE", () => {
            const caseExpr = builder.case('status').end();

            expect(caseExpr.value).toBe('CASE status END');
            expect(caseExpr.bindings).toEqual([]);
        });

        test("should handle CASE with only ELSE", () => {
            const caseExpr = builder.case('status').else('Default').end();

            expect(caseExpr.value).toBe('CASE status ELSE ? END');
            expect(caseExpr.bindings).toEqual(['Default']);
        });

        test("should handle function that builds no conditions", () => {
            const caseExpr = builder.case('id')
                .when(query => {
                    // Function that doesn't add any conditions
                }, 'Test')
                .end();

            expect(caseExpr.value).toBe('CASE WHEN 1=1 THEN ? END');
            expect(caseExpr.bindings).toEqual(['Test']);
        });
    });

    describe("SQL binding parameter validation", () => {
        test("should have matching placeholder and binding counts", () => {
            const caseExpr = builder.case('priority')
                .when(query => query.whereIn('id', [1, 2, 3]), 'High')
                .when(query => query.select('user_id').from('VipUsers').where('level', '>', 5), 'VIP')
                .else('Normal')
                .end();

            const placeholderCount = (caseExpr.value.match(/\?/g) || []).length;
            const bindingCount = caseExpr.bindings.length;

            expect(placeholderCount).toBe(bindingCount);
            expect(placeholderCount).toBeGreaterThan(0);
        });

        test("should handle complex mixed conditions correctly", () => {
            const caseExpr = builder.case()
                .when(query => query.where('total', '>', 1000).where('status', 'active'), 'Premium')
                .when(query => query.select('id').from('VipCustomers'), 'VIP')
                .else('Regular')
                .end();

            const placeholderCount = (caseExpr.value.match(/\?/g) || []).length;
            const bindingCount = caseExpr.bindings.length;

            expect(placeholderCount).toBe(bindingCount);
        });
    });
});