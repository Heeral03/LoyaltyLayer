/*
    Business Contract - Individual Shop Loyalty Program
    Deployed by Factory for each shop owner.
    Manages loyalty points, TON tips, purchases, and withdrawals.

    Op codes:
        1 = ISSUE_POINTS   (owner issues points manually)
        2 = TIP            (customer tips in TON → auto-earns points)
        3 = WITHDRAW       (owner withdraws accumulated tips)
        4 = BUY_PRODUCT    (customer pays for purchase in TON → earns points)
        5 = REDEEM_POINTS  (customer redeems their points)

    Points rate: 1 TON = 100 points  (1 pt per 0.01 TON)
*/

// --- Op codes ---
const OP_ISSUE_POINTS:  uint32 = 1;
const OP_TIP:           uint32 = 2;
const OP_WITHDRAW:      uint32 = 3;
const OP_BUY_PRODUCT:   uint32 = 4;
const OP_REDEEM_POINTS: uint32 = 5;

// --- Error codes ---
const ERROR_UNAUTHORIZED:     uint32 = 101;
const ERROR_ZERO_POINTS:      uint32 = 102;
const ERROR_ZERO_TIP:         uint32 = 103;
const ERROR_INSUFFICIENT_BAL: uint32 = 104;
const ERROR_ZERO_PAYMENT:     uint32 = 105;
const ERROR_INSUFFICIENT_PTS: uint32 = 106;

// --- Points conversion: 1 pt per 0.01 TON ---
const POINTS_PER_NANO: coins = ton("0.01");

// --- Storage ---

struct BusinessStorage {
    owner:          address;
    businessName:   cell;
    businessId:     uint64;
    totalCustomers: uint64;
    totalTips:      uint64;
    customerPoints: map<address, uint64>;
}

fun BusinessStorage.load(): BusinessStorage {
    return BusinessStorage.fromCell(contract.getData());
}

fun BusinessStorage.save(self) {
    contract.setData(self.toCell());
}

// --- Message structs ---

struct IssuePointsRequest {
    customer: address;
    points:   uint64;
}

struct WithdrawRequest {
    amount: uint64;
}

struct RedeemPointsRequest {
    points: uint64;
}

// --- Confirmation structs ---

struct PointsIssuedConfirm {
    op:     uint32;
    points: uint64;
}

struct TipReceiptConfirm {
    op:     uint32;
    amount: uint64;
}

struct PurchaseConfirm {
    op:           uint32;
    amountPaid:   uint64;
    pointsEarned: uint64;
    totalPoints:  uint64;
}

struct RedeemConfirm {
    op:              uint32;
    pointsRedeemed:  uint64;
    pointsRemaining: uint64;
}

// --- Send helpers ---

fun sendExcess(to: address) {
    val msg = createMessage({
        bounce: BounceMode.NoBounce,
        value: ton("0"),
        dest: to,
    });
    msg.send(SEND_MODE_CARRY_ALL_REMAINING_MESSAGE_VALUE);
}

fun sendPointsConfirmation(to: address, points: uint64) {
    val msg = createMessage({
        bounce: BounceMode.NoBounce,
        value: ton("0.01"),
        dest: to,
        body: PointsIssuedConfirm { op: 0, points: points }
    });
    msg.send(SEND_MODE_REGULAR);
}

fun sendTipReceipt(to: address, amount: uint64) {
    val msg = createMessage({
        bounce: BounceMode.NoBounce,
        value: ton("0.01"),
        dest: to,
        body: TipReceiptConfirm { op: 0, amount: amount }
    });
    msg.send(SEND_MODE_REGULAR);
}

fun sendPurchaseConfirm(to: address, amountPaid: uint64, pointsEarned: uint64, totalPoints: uint64) {
    val msg = createMessage({
        bounce: BounceMode.NoBounce,
        value: ton("0.01"),
        dest: to,
        body: PurchaseConfirm {
            op:           0,
            amountPaid:   amountPaid,
            pointsEarned: pointsEarned,
            totalPoints:  totalPoints,
        }
    });
    msg.send(SEND_MODE_REGULAR);
}

fun sendRedeemConfirm(to: address, pointsRedeemed: uint64, pointsRemaining: uint64) {
    val msg = createMessage({
        bounce: BounceMode.NoBounce,
        value: ton("0.01"),
        dest: to,
        body: RedeemConfirm {
            op:              0,
            pointsRedeemed:  pointsRedeemed,
            pointsRemaining: pointsRemaining,
        }
    });
    msg.send(SEND_MODE_REGULAR);
}

// --- Handlers ---

// OP 1: Owner manually issues points to a customer
fun handleIssuePoints(msgBody: slice, sender: address) {
    var storage = BusinessStorage.load();

    assert(sender == storage.owner) throw ERROR_UNAUTHORIZED;

    val req = IssuePointsRequest.fromSlice(msgBody);
    assert(req.points > 0) throw ERROR_ZERO_POINTS;

    // Read existing points
    val existing: uint64 = storage.customerPoints.get(req.customer).isFound
        ? storage.customerPoints.get(req.customer).loadValue()
        : 0;

    // Increment customer count if new
    if (existing == 0) {
        storage.totalCustomers += 1;
    }

    val newTotal = existing + req.points;
    storage.customerPoints.set(req.customer, newTotal);
    storage.save();

    sendPointsConfirmation(req.customer, newTotal);
    sendExcess(sender);
}

// OP 2: Customer tips owner in TON -> auto-earns points
fun handleTip(sender: address, msgValue: coins) {
    assert(msgValue > 0) throw ERROR_ZERO_TIP;

    var storage = BusinessStorage.load();
    storage.totalTips += msgValue as uint64;

    val pointsEarned: uint64 = (msgValue / POINTS_PER_NANO) as uint64;
    if (pointsEarned > 0) {
        val existing: uint64 = storage.customerPoints.get(sender).isFound
            ? storage.customerPoints.get(sender).loadValue()
            : 0;
        if (existing == 0) {
            storage.totalCustomers += 1;
        }
        storage.customerPoints.set(sender, existing + pointsEarned);
    }

    storage.save();
    sendTipReceipt(sender, msgValue as uint64);
}

// OP 3: Owner withdraws accumulated TON
fun handleWithdraw(msgBody: slice, sender: address) {
    var storage = BusinessStorage.load();

    assert(sender == storage.owner) throw ERROR_UNAUTHORIZED;

    val req = WithdrawRequest.fromSlice(msgBody);

    val withdrawAmount: uint64 = req.amount == 0
        ? storage.totalTips
        : req.amount;

    assert(withdrawAmount > 0) throw ERROR_INSUFFICIENT_BAL;
    assert(withdrawAmount <= storage.totalTips) throw ERROR_INSUFFICIENT_BAL;

    storage.totalTips -= withdrawAmount;
    storage.save();

    val withdrawMsg = createMessage({
        bounce: BounceMode.NoBounce,
        value: withdrawAmount as coins,
        dest: storage.owner,
    });
    withdrawMsg.send(SEND_MODE_REGULAR);

    sendExcess(sender);
}

// OP 4: Customer pays for product in TON -> auto-earns points
fun handleBuyProduct(sender: address, msgValue: coins) {
    assert(msgValue > 0) throw ERROR_ZERO_PAYMENT;

    var storage = BusinessStorage.load();
    storage.totalTips += msgValue as uint64;

    val pointsEarned: uint64 = (msgValue / POINTS_PER_NANO) as uint64;
    var newTotal: uint64 = 0;

    val existingResult = storage.customerPoints.get(sender);
    val existing: uint64 = existingResult.isFound ? existingResult.loadValue() : 0;

    if (pointsEarned > 0) {
        if (existing == 0) {
            storage.totalCustomers += 1;
        }
        newTotal = existing + pointsEarned;
        storage.customerPoints.set(sender, newTotal);
    } else {
        newTotal = existing;
    }

    storage.save();
    sendPurchaseConfirm(sender, msgValue as uint64, pointsEarned, newTotal);
}

// OP 5: Customer redeems points
fun handleRedeemPoints(msgBody: slice, sender: address) {
    var storage = BusinessStorage.load();

    val req = RedeemPointsRequest.fromSlice(msgBody);
    assert(req.points > 0) throw ERROR_ZERO_POINTS;

    val existingResult = storage.customerPoints.get(sender);
    val existing: uint64 = existingResult.isFound ? existingResult.loadValue() : 0;

    assert(existing >= req.points) throw ERROR_INSUFFICIENT_PTS;

    val remaining = existing - req.points;
    storage.customerPoints.set(sender, remaining);
    storage.save();

    sendRedeemConfirm(sender, req.points, remaining);
    sendExcess(sender);
}

// --- Entry point ---

fun onInternalMessage(in: InMessage) {
    if (in.body.isEmpty()) {
        return;
    }

    val op = in.body.loadUint(32);

    if (op == OP_ISSUE_POINTS) {
        handleIssuePoints(in.body, in.senderAddress);
    } else if (op == OP_TIP) {
        handleTip(in.senderAddress, in.valueCoins);
    } else if (op == OP_WITHDRAW) {
        handleWithdraw(in.body, in.senderAddress);
    } else if (op == OP_BUY_PRODUCT) {
        handleBuyProduct(in.senderAddress, in.valueCoins);
    } else if (op == OP_REDEEM_POINTS) {
        handleRedeemPoints(in.body, in.senderAddress);
    }
}

// --- Get methods ---

get fun getCustomerPoints(customer: address): uint64 {
    val storage = lazy BusinessStorage.load();
    val result = storage.customerPoints.get(customer);
    return result.isFound ? result.loadValue() : 0;
}

get fun getBusinessInfo(): (address, cell, uint64, uint64, uint64) {
    val storage = lazy BusinessStorage.load();
    return (
        storage.owner,
        storage.businessName,
        storage.businessId,
        storage.totalCustomers,
        storage.totalTips
    );
}

get fun getOwner(): address {
    val storage = lazy BusinessStorage.load();
    return storage.owner;
}