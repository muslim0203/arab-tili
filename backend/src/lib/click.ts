import crypto from "crypto";
import { config } from "../config.js";

const BASE_PAY_URL = "https://my.click.uz/services/pay";

export function getClickPayUrl(params: {
  amount: number;
  merchantTransId: string;
  returnUrl?: string;
  merchantUserId?: string;
}): string {
  const { merchantId, serviceId } = config.click;
  const search = new URLSearchParams({
    service_id: String(serviceId),
    merchant_id: String(merchantId),
    amount: params.amount.toFixed(2),
    transaction_param: params.merchantTransId,
  });
  if (params.returnUrl) search.set("return_url", params.returnUrl);
  if (params.merchantUserId) search.set("merchant_user_id", params.merchantUserId);
  return `${BASE_PAY_URL}?${search.toString()}`;
}

/** Prepare: sign_string = md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time) */
export function verifyPrepareSign(params: {
  click_trans_id: string;
  service_id: string;
  merchant_trans_id: string;
  amount: string;
  action: string;
  sign_time: string;
  sign_string: string;
}): boolean {
  const expected = crypto
    .createHash("md5")
    .update(
      [
        params.click_trans_id,
        params.service_id,
        config.click.secretKey,
        params.merchant_trans_id,
        params.amount,
        params.action,
        params.sign_time,
      ].join("")
    )
    .digest("hex");
  return expected === params.sign_string;
}

/** Complete: sign_string = md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time) */
export function verifyCompleteSign(params: {
  click_trans_id: string;
  service_id: string;
  merchant_trans_id: string;
  merchant_prepare_id: string;
  amount: string;
  action: string;
  sign_time: string;
  sign_string: string;
}): boolean {
  const expected = crypto
    .createHash("md5")
    .update(
      [
        params.click_trans_id,
        params.service_id,
        config.click.secretKey,
        params.merchant_trans_id,
        params.merchant_prepare_id,
        params.amount,
        params.action,
        params.sign_time,
      ].join("")
    )
    .digest("hex");
  return expected === params.sign_string;
}
