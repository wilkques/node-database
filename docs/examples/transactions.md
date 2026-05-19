# Transaction Handling Examples

This document provides comprehensive examples of transaction handling for maintaining data consistency and integrity.

## Table of Contents

1. [Transaction Basics](#transaction-basics)
2. [Simple Transactions](#simple-transactions)
3. [Complex Transactions](#complex-transactions)
4. [Error Handling](#error-handling)
5. [Transaction Isolation](#transaction-isolation)
6. [Best Practices](#best-practices)

---

## Transaction Basics

Transactions ensure that a series of database operations either all succeed (commit) or all fail (rollback), maintaining data consistency.

### ACID Properties

- **Atomicity**: All operations succeed or all fail
- **Consistency**: Database remains in valid state
- **Isolation**: Transactions don't interfere with each other
- **Durability**: Committed changes are permanent

## Simple Transactions

### Basic Transaction Pattern

```javascript
async function basicTransaction() {
    const transaction = await db.transaction();
    
    try {
        // Perform operations within transaction
        await transaction.table('users').insert({
            name: 'John Doe',
            email: 'john@example.com'
        });
        
        await transaction.table('profiles').insert({
            user_id: 1, // Assuming auto-increment ID is 1
            bio: 'Software developer'
        });
        
        // Commit if all operations succeed
        await transaction.commit();
        console.log('Transaction completed successfully');
        
    } catch (error) {
        // Rollback if any operation fails
        await transaction.rollback();
        console.error('Transaction failed:', error);
        throw error;
    }
}
```

### Transfer Money Example

```javascript
async function transferMoney(fromAccountId, toAccountId, amount) {
    const transaction = await db.transaction();
    
    try {
        // Check sender balance
        const fromAccount = await transaction.table('accounts')
            .where('id', fromAccountId)
            .first();
        
        if (!fromAccount || fromAccount.balance < amount) {
            throw new Error('Insufficient funds');
        }
        
        // Deduct from sender
        await transaction.table('accounts')
            .where('id', fromAccountId)
            .decrement('balance', amount);
        
        // Add to receiver
        await transaction.table('accounts')
            .where('id', toAccountId)
            .increment('balance', amount);
        
        // Log the transfer
        await transaction.table('transfers').insert({
            from_account_id: fromAccountId,
            to_account_id: toAccountId,
            amount: amount,
            transfer_date: new Date()
        });
        
        await transaction.commit();
        return { success: true, message: 'Transfer completed' };
        
    } catch (error) {
        await transaction.rollback();
        return { success: false, error: error.message };
    }
}
```

## Complex Transactions

### E-commerce Order Processing

```javascript
async function processOrder(orderData) {
    const transaction = await db.transaction();
    
    try {
        // Create order
        const orderResult = await transaction.table('orders').insert({
            user_id: orderData.userId,
            total_amount: orderData.totalAmount,
            status: 'processing',
            created_at: new Date()
        });
        
        const orderId = orderResult.insertId;
        
        // Add order items and update inventory
        for (const item of orderData.items) {
            // Check inventory
            const product = await transaction.table('products')
                .where('id', item.productId)
                .first();
            
            if (!product || product.stock < item.quantity) {
                throw new Error(`Insufficient stock for product ${item.productId}`);
            }
            
            // Add order item
            await transaction.table('order_items').insert({
                order_id: orderId,
                product_id: item.productId,
                quantity: item.quantity,
                price: item.price
            });
            
            // Update inventory
            await transaction.table('products')
                .where('id', item.productId)
                .decrement('stock', item.quantity);
        }
        
        // Update customer points
        await transaction.table('users')
            .where('id', orderData.userId)
            .increment('reward_points', Math.floor(orderData.totalAmount / 10));
        
        // Send confirmation email (outside transaction)
        const emailData = {
            orderId: orderId,
            userEmail: orderData.userEmail,
            totalAmount: orderData.totalAmount
        };
        
        await transaction.commit();
        
        // Send email after successful transaction
        await sendOrderConfirmationEmail(emailData);
        
        return { success: true, orderId: orderId };
        
    } catch (error) {
        await transaction.rollback();
        console.error('Order processing failed:', error);
        return { success: false, error: error.message };
    }
}
```

### Batch User Registration

```javascript
async function batchRegisterUsers(usersData) {
    const transaction = await db.transaction();
    const results = [];
    
    try {
        for (const userData of usersData) {
            // Check if email exists
            const existingUser = await transaction.table('users')
                .where('email', userData.email)
                .first();
            
            if (existingUser) {
                results.push({
                    email: userData.email,
                    success: false,
                    error: 'Email already exists'
                });
                continue;
            }
            
            // Insert user
            const userResult = await transaction.table('users').insert({
                name: userData.name,
                email: userData.email,
                password_hash: userData.passwordHash,
                created_at: new Date()
            });
            
            const userId = userResult.insertId;
            
            // Create profile
            await transaction.table('profiles').insert({
                user_id: userId,
                first_name: userData.firstName,
                last_name: userData.lastName,
                phone: userData.phone
            });
            
            // Assign default role
            await transaction.table('user_roles').insert({
                user_id: userId,
                role_id: 3, // Default user role
                assigned_at: new Date()
            });
            
            results.push({
                email: userData.email,
                success: true,
                userId: userId
            });
        }
        
        await transaction.commit();
        return { success: true, results: results };
        
    } catch (error) {
        await transaction.rollback();
        console.error('Batch registration failed:', error);
        return { success: false, error: error.message };
    }
}
```

## Error Handling

### Detailed Error Handling

```javascript
async function robustTransaction() {
    const transaction = await db.transaction();
    
    try {
        // Operation 1
        const result1 = await transaction.table('table1').insert({
            data: 'value1'
        });
        
        // Operation 2
        const result2 = await transaction.table('table2').insert({
            related_id: result1.insertId,
            data: 'value2'
        });
        
        // Operation 3 with validation
        const count = await transaction.table('table3')
            .where('status', 'active')
            .count();
        
        if (count > 100) {
            throw new Error('Too many active records');
        }
        
        await transaction.commit();
        return { success: true };
        
    } catch (error) {
        await transaction.rollback();
        
        // Log specific error types
        if (error.code === 'ER_DUP_ENTRY') {
            console.error('Duplicate entry error:', error);
            return { success: false, error: 'Duplicate data' };
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            console.error('Foreign key constraint error:', error);
            return { success: false, error: 'Invalid reference' };
        } else {
            console.error('Transaction error:', error);
            return { success: false, error: 'Transaction failed' };
        }
    }
}
```

### Retry Logic

```javascript
async function transactionWithRetry(operation, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            // Check if error is retryable
            if (error.code === 'ER_LOCK_DEADLOCK' || 
                error.code === 'ER_LOCK_WAIT_TIMEOUT') {
                
                console.warn(`Transaction attempt ${attempt} failed, retrying...`);
                
                // Wait before retry with exponential backoff
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                continue;
            } else {
                // Non-retryable error
                throw error;
            }
        }
    }
    
    throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Usage
const result = await transactionWithRetry(async () => {
    const transaction = await db.transaction();
    
    try {
        // Your transaction operations here
        await transaction.table('users').insert({ name: 'Test User' });
        await transaction.commit();
        return { success: true };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
});
```

## Transaction Isolation

### Read Committed Example

```javascript
async function readCommittedExample() {
    // Transaction 1: Update data
    const transaction1 = await db.transaction();
    
    try {
        await transaction1.table('accounts')
            .where('id', 1)
            .update({ balance: 1000 });
        
        // Don't commit yet - data is not visible to other transactions
        
        // Transaction 2: Read data (will see old value)
        const transaction2 = await db.transaction();
        const account = await transaction2.table('accounts')
            .where('id', 1)
            .first();
        
        console.log('Account balance before commit:', account.balance);
        await transaction2.commit();
        
        // Now commit first transaction
        await transaction1.commit();
        
        // Transaction 3: Read data (will see new value)
        const transaction3 = await db.transaction();
        const updatedAccount = await transaction3.table('accounts')
            .where('id', 1)
            .first();
        
        console.log('Account balance after commit:', updatedAccount.balance);
        await transaction3.commit();
        
    } catch (error) {
        await transaction1.rollback();
        throw error;
    }
}
```

### Serializable Transaction

```javascript
async function serializableExample() {
    const transaction = await db.transaction();
    
    try {
        // Set isolation level to SERIALIZABLE
        await transaction.raw('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
        
        // Perform operations that require highest isolation
        const totalOrders = await transaction.table('orders')
            .where('status', 'completed')
            .sum('total');
        
        const reportId = await transaction.table('reports').insertGetId({
            report_type: 'daily_sales',
            total_amount: totalOrders,
            generated_at: new Date()
        });
        
        await transaction.commit();
        return { reportId, totalAmount: totalOrders };
        
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

## Best Practices

### Keep Transactions Short

```javascript
// Good: Short transaction
async function shortTransaction() {
    const transaction = await db.transaction();
    
    try {
        // Quick operations only
        await transaction.table('users').insert({ name: 'User' });
        await transaction.table('profiles').insert({ user_id: 1 });
        
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

// Bad: Long transaction with external operations
async function longTransaction() {
    const transaction = await db.transaction();
    
    try {
        await transaction.table('users').insert({ name: 'User' });
        
        // Don't do this - external operations in transaction
        await sendEmail('user@example.com');
        await uploadFile('user-avatar.jpg');
        await callExternalAPI();
        
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

### Handle Deadlocks Gracefully

```javascript
async function deadlockSafeTransaction() {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
        const transaction = await db.transaction();
        
        try {
            // Always access resources in consistent order to prevent deadlocks
            await transaction.table('table_a')
                .where('id', 1)
                .update({ value: 'new_value' });
            
            await transaction.table('table_b')
                .where('id', 2)
                .update({ value: 'new_value' });
            
            await transaction.commit();
            return { success: true };
            
        } catch (error) {
            await transaction.rollback();
            
            if (error.code === 'ER_LOCK_DEADLOCK' && attempt < maxRetries - 1) {
                attempt++;
                console.warn(`Deadlock detected, retrying (${attempt}/${maxRetries})`);
                
                // Random delay to reduce collision probability
                const delay = 100 + Math.random() * 900;
                await new Promise(resolve => setTimeout(resolve, delay));
                
                continue;
            }
            
            throw error;
        }
    }
}
```

### Transaction Helper Function

```javascript
async function withTransaction(operation) {
    const transaction = await db.transaction();
    
    try {
        const result = await operation(transaction);
        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

// Usage
const result = await withTransaction(async (trx) => {
    const user = await trx.table('users').insert({
        name: 'John Doe',
        email: 'john@example.com'
    });
    
    await trx.table('profiles').insert({
        user_id: user.insertId,
        bio: 'New user'
    });
    
    return { userId: user.insertId };
});
```

### Nested Transactions (Savepoints)

```javascript
async function nestedTransactionExample() {
    const transaction = await db.transaction();
    
    try {
        // Main operation
        const orderId = await transaction.table('orders').insertGetId({
            user_id: 1,
            total: 100,
            status: 'processing'
        });
        
        // Create savepoint
        await transaction.raw('SAVEPOINT sp1');
        
        try {
            // Risky operation
            await transaction.table('inventory').update({
                stock: db.raw('stock - ?', [10])
            }).where('product_id', 1);
            
            // Check if operation was valid
            const product = await transaction.table('inventory')
                .where('product_id', 1)
                .first();
            
            if (product.stock < 0) {
                throw new Error('Insufficient stock');
            }
            
        } catch (error) {
            // Rollback to savepoint
            await transaction.raw('ROLLBACK TO SAVEPOINT sp1');
            console.warn('Inventory update failed, continuing without it');
        }
        
        // Continue with main operation
        await transaction.table('order_items').insert({
            order_id: orderId,
            product_id: 1,
            quantity: 10
        });
        
        await transaction.commit();
        return { orderId };
        
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

## Performance Considerations

### Batch Processing in Transactions

```javascript
async function efficientBatchProcessing(items, batchSize = 100) {
    const results = [];
    
    // Process in smaller batches to avoid long locks
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        const batchResult = await withTransaction(async (trx) => {
            const insertResults = [];
            
            for (const item of batch) {
                const result = await trx.table('items').insert(item);
                insertResults.push(result);
            }
            
            return insertResults;
        });
        
        results.push(...batchResult);
        
        // Optional: Small delay between batches
        if (i + batchSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }
    
    return results;
}
```

### Read-Only Transactions

```javascript
async function readOnlyTransaction() {
    const transaction = await db.transaction();
    
    try {
        // Set read-only for better performance
        await transaction.raw('SET TRANSACTION READ ONLY');
        
        // Multiple consistent reads
        const users = await transaction.table('users')
            .where('status', 'active')
            .get();
        
        const orders = await transaction.table('orders')
            .whereIn('user_id', users.map(u => u.id))
            .get();
        
        // No commit needed for read-only, but good practice
        await transaction.commit();
        
        return { users, orders };
        
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

## Related Documentation

- [Basic Queries](./basic-queries.md) - SELECT operations
- [Data Modification](./data-modification.md) - INSERT, UPDATE, DELETE
- [JOIN Examples](./joins.md) - Table joining operations
- [Builder API](../api/Builder.md) - Complete query builder reference