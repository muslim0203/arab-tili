import { config } from "../config.js";

const CHECKOUT_URL = "https://checkout.paycom.uz";

/**
 * Payme checkout URL yaratish.
 * Format: https://checkout.paycom.uz/base64(m=MERCHANT_ID;ac.order_id=ORDER_ID;a=AMOUNT_IN_TIYIN;c=RETURN_URL)
 */
export function getPaymeCheckoutUrl(params: {
    amount: number; // UZS da (masalan 99_000 so'm)
    orderId: string;
    returnUrl?: string;
}): string {
    const { merchantId } = config.payme;
    // Payme summa tiyinlarda — 1 so'm = 100 tiyin
    const amountInTiyin = params.amount * 100;

    let paramStr = `m=${merchantId};ac.order_id=${params.orderId};a=${amountInTiyin}`;
    if (params.returnUrl) {
        paramStr += `;c=${encodeURIComponent(params.returnUrl)}`;
    }

    const encoded = Buffer.from(paramStr).toString("base64");
    return `${CHECKOUT_URL}/${encoded}`;
}

/**
 * Payme JSON-RPC callback uchun Basic Auth tekshirish.
 * Authorization header: "Basic base64(Paycom:MERCHANT_KEY)"
 */
export function verifyPaymeAuth(authHeader: string | undefined): boolean {
    if (!authHeader || !authHeader.startsWith("Basic ")) return false;
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
    const [login, password] = decoded.split(":");
    return login === "Paycom" && password === config.payme.merchantKey;
}

// ── Payme JSON-RPC Error kodlari ──
export const PaymeError = {
    InvalidAmount: { code: -31001, message: { uz: "Noto'g'ri summa", ru: "Неверная сумма", en: "Invalid amount" } },
    OrderNotFound: { code: -31050, message: { uz: "Buyurtma topilmadi", ru: "Заказ не найден", en: "Order not found" } },
    CantPerform: { code: -31008, message: { uz: "Operatsiya bajarib bo'lmaydi", ru: "Невозможно выполнить", en: "Cannot perform" } },
    TransactionNotFound: { code: -31003, message: { uz: "Tranzaksiya topilmadi", ru: "Транзакция не найдена", en: "Transaction not found" } },
    AlreadyDone: { code: -31007, message: { uz: "Allaqachon bajarilgan", ru: "Уже выполнена", en: "Already done" } },
    CantCancel: { code: -31007, message: { uz: "Bekor qilib bo'lmaydi", ru: "Невозможно отменить", en: "Cannot cancel" } },
    Unauthorized: { code: -32504, message: { uz: "Avtorizatsiya xatosi", ru: "Ошибка авторизации", en: "Authorization error" } },
    MethodNotFound: { code: -32601, message: { uz: "Metod topilmadi", ru: "Метод не найден", en: "Method not found" } },
};

export function paymeJsonRpcError(id: unknown, error: typeof PaymeError.InvalidAmount) {
    return { jsonrpc: "2.0", id, error };
}

export function paymeJsonRpcResult(id: unknown, result: Record<string, unknown>) {
    return { jsonrpc: "2.0", id, result };
}
