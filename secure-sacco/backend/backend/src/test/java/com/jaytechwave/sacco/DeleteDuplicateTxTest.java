package com.jaytechwave.sacco;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
public class DeleteDuplicateTxTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    public void deleteDuplicateTransactions() {
        System.out.println("--- DELETING DUPLICATE TRANSACTIONS FOR UJ3BY94E9Q ---");
        
        // 1. Delete journal entries with reference BANK-CR-UJ3BY94E9Q
        int deletedJe = jdbcTemplate.update("DELETE FROM journal_entries WHERE reference LIKE '%BANK-CR-UJ3BY94E9Q%' OR reference LIKE '%UJ3BY94E9Q%' AND credit_amount = 100 AND account_id IN (SELECT id FROM accounts WHERE code = '2110')");
        System.out.println("Deleted Journal Entries (Suspense): " + deletedJe);

        // Delete the matching debit entry to keep ledger balanced
        int deletedDebitJe = jdbcTemplate.update("DELETE FROM journal_entries WHERE reference LIKE '%BANK-CR-UJ3BY94E9Q%'");
        System.out.println("Deleted Journal Entries (Other side): " + deletedDebitJe);

        // Also delete the transactions (gl_transactions)
        int deletedTx = jdbcTemplate.update("DELETE FROM transactions WHERE reference LIKE '%BANK-CR-UJ3BY94E9Q%'");
        System.out.println("Deleted Transactions: " + deletedTx);

        // 2. Delete Payments
        int deletedPayments = jdbcTemplate.update("DELETE FROM payments WHERE mpesa_ref LIKE '%BANK-CR-UJ3BY94E9Q%'");
        System.out.println("Deleted Payments: " + deletedPayments);

        // 3. Delete CoopTransaction
        int deletedCoop = jdbcTemplate.update("DELETE FROM coop_transactions WHERE mpesa_ref LIKE '%BANK-CR-UJ3BY94E9Q%'");
        System.out.println("Deleted CoopTransactions: " + deletedCoop);
        
        System.out.println("--- DELETION COMPLETE ---");
    }
}
