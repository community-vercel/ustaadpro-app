# UstaadPro Reward System

The reward system works like a small customer discount wallet.

Customers earn reward points from completed services and delivered shop orders. Later, they can use those points as a discount, but only within safe limits controlled from the admin panel.

## Recommended Admin Settings

```text
Reward Point Value: 25
Minimum Redeem Value: 100
Service Points On Completion: 1
Service Max Discount: 10
Shop Reward Earn: 0.5
Shop Max Discount: 5
Reward System: Enabled
```

## What Each Setting Means

### Reward Point Value: 25

This means:

```text
1 reward point = Rs. 25 discount value
```

Examples:

```text
4 points = Rs. 100
10 points = Rs. 250
20 points = Rs. 500
```

### Minimum Redeem Value: 100

The customer cannot use rewards until they have at least Rs. 100 reward value.

Because 1 point is Rs. 25:

```text
4 points x Rs. 25 = Rs. 100
```

So the customer needs at least 4 points before using rewards.

### Service Points On Completion: 1

The customer earns points only when a service order is completed.

Example:

```text
Customer books AC service
Admin marks order as Completed
Customer earns 1 point
1 point = Rs. 25 reward value
```

After 4 completed services:

```text
4 points = Rs. 100 reward value
```

Cancelled services do not earn reward points.

### Service Max Discount: 10

The customer can use rewards for a maximum of 10% discount on the service subtotal.

Example:

```text
Service subtotal = Rs. 2,000
Maximum reward discount = 10%
10% of Rs. 2,000 = Rs. 200
```

Even if the customer has Rs. 1,000 reward balance, they can only use Rs. 200 on this booking.

Rewards do not apply to:

```text
Inspection fee
Platform charges
Cancelled orders
```

### Shop Reward Earn: 0.5

The customer earns reward value equal to 0.5% of the shop product subtotal.

Example:

```text
Shop product subtotal = Rs. 10,000
Reward earn = 0.5%
0.5% of Rs. 10,000 = Rs. 50 reward value
```

Because 1 point is Rs. 25:

```text
Rs. 50 reward value = 2 points
```

The customer earns these points only when the shop order is delivered.

### Shop Max Discount: 5

The customer can use rewards for a maximum of 5% discount on the shop product subtotal.

Example:

```text
Shop product subtotal = Rs. 5,000
Maximum reward discount = 5%
5% of Rs. 5,000 = Rs. 250
```

Even if the customer has Rs. 1,000 reward balance, they can only use Rs. 250 on this shop order.

Rewards do not apply to:

```text
Shipping cost
Cancelled shop orders
```

### Reward System: Enabled

When enabled:

```text
Customers can earn reward points
Customers can redeem reward discounts
```

When disabled:

```text
Customers cannot earn points
Customers cannot use reward discounts
```

## Simple Analogy

Think of reward points like small UstaadPro coins.

```text
1 coin = Rs. 25
```

Customers collect coins by completing services or receiving shop orders.

They can spend coins later, but only a small percentage of the bill can be paid with coins.

This keeps customers motivated while protecting UstaadPro from giving away expensive services for free.

## Safe Business Rules

Rewards should always follow these rules:

```text
Give service points only after service is completed
Give shop points only after shop order is delivered
Do not give points on cancelled orders
Do not apply rewards to inspection fee
Do not apply rewards to platform charges
Do not apply rewards to shipping cost
Limit reward discount by percentage
Keep all values controlled from admin panel
```

