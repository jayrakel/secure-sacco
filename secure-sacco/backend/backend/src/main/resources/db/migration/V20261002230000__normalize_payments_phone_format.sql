-- Normalize payments.sender_phone_number from "254XXXXXXXXX" to "+254XXXXXXXXX"
-- to match PhoneUtils.normalizePhone canonical format.
-- Only touches Kenyan 12-digit numbers without the + prefix.
UPDATE payments
SET sender_phone_number = '+' || sender_phone_number
WHERE sender_phone_number IS NOT NULL
  AND sender_phone_number LIKE '254%'
  AND sender_phone_number NOT LIKE '+%'
  AND LENGTH(sender_phone_number) = 12;
