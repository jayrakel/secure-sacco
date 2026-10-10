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
        
        // 1. Delete journal entries (this cascades to journal_entry_lines)
        int deletedJe = jdbcTemplate.update("DELETE FROM journal_entries WHERE reference_number LIKE '%BANK-CR-UJ3BY94E9Q%' OR reference_number LIKE '%UJ3BY94E9Q%'");
        System.out.println("Deleted Journal Entries: " + deletedJe);

        // 2. Delete Payments
        int deletedPayments = jdbcTemplate.update("DELETE FROM payments WHERE mpesa_ref LIKE '%BANK-CR-UJ3BY94E9Q%' OR mpesa_ref LIKE '%UJ3BY94E9Q%'");
        System.out.println("Deleted Payments: " + deletedPayments);

        // 3. Delete CoopTransaction
        int deletedCoop = jdbcTemplate.update("DELETE FROM coop_transactions WHERE mpesa_ref LIKE '%BANK-CR-UJ3BY94E9Q%' OR mpesa_ref LIKE '%UJ3BY94E9Q%'");
        System.out.println("Deleted CoopTransactions: " + deletedCoop);
        
        System.out.println("--- DELETION COMPLETE ---");
    }
}
