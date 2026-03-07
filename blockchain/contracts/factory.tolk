/*
What data does Factory store?
    - next business ID
    - total businesses count
    - business code (for deploying child contracts)
*/

const DEPLOY_BUSINESS_OP: uint32 = 1;
const ERROR_UNAUTHORIZED: uint32 = 101;

// --- Storage --- (manual serialization, no auto toCell/fromCell)

struct Storage {
    nextId:       uint64;
    totalCount:   uint64;
    businessCode: cell;
}

fun Storage.load(): Storage {
    var ds = contract.getData().beginParse();  // var not val
    val nextId       = ds.loadUint(64);
    val totalCount   = ds.loadUint(64);
    val businessCode = ds.loadRef();
    return Storage { nextId, totalCount, businessCode };
}

fun Storage.save(self) {
    val data = beginCell()
        .storeUint(self.nextId,     64)
        .storeUint(self.totalCount, 64)
        .storeRef(self.businessCode)
        .endCell();
    contract.setData(data);
}

// --- Message structs ---

struct DeployBusinessMsg {
    ownerAddr:        address;
    businessNameCell: cell;
}

struct BusinessDeployed {
    opConfirm:  uint32;   // 0 = text comment op
    businessId: uint64;
}

// --- Handlers ---

fun handleDeployBusiness(msgBody: slice, sender: address) {
    val msg = DeployBusinessMsg.fromSlice(msgBody);

    var storage = Storage.load();
    val businessId = storage.nextId;

    // Build initial data cell for the child business contract
val businessData = beginCell()
    .storeAddress(msg.ownerAddr)
    .storeRef(msg.businessNameCell)
    .storeUint(businessId, 64)
    .storeUint(0, 64)
    .storeUint(0, 64)
    .storeDict(null)      // ← empty customerPoints map
    .endCell();

    val businessInitialState: ContractState = {
        code: storage.businessCode,
        data: businessData,
    };

    // Deploy the business contract and send confirmation to owner in one message.
    // The address is auto-calculated from stateInit by the runtime/off-chain indexer.
    // On-chain we send the deploy message; the sender will observe the new contract address.
    val deployMsg = createMessage({
        bounce: BounceMode.NoBounce,
        value: ton("0.05"),
        dest: { stateInit: businessInitialState },
        body: BusinessDeployed {
            opConfirm:  0,
            businessId: businessId,
        }
    });
    deployMsg.send(SEND_MODE_REGULAR);

    // Update counters
    storage.nextId      = businessId + 1;
    storage.totalCount += 1;
    storage.save();
}

// --- Entry points ---

fun onInternalMessage(in: InMessage) {
    if (in.body.isEmpty()) {
        return;
    }

    val op = in.body.loadUint(32);

    if (op == DEPLOY_BUSINESS_OP) {
        handleDeployBusiness(in.body, in.senderAddress); 
    }
}

// --- Getters ---

get fun getTotalBusinesses(): uint64 {
    val storage =  Storage.load();
    return storage.totalCount;
}

get fun getNextId(): uint64 {
    val storage =  Storage.load();
    return storage.nextId;
}

// --- Init ---

fun onInit() {
    var storage = Storage {
        nextId:       1,
        totalCount:   0,
        businessCode: contract.getCode(),
    };
    storage.save();
}