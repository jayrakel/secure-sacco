import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ReportsHubScreen extends StatelessWidget {
  const ReportsHubScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports Hub'),
      ),
      body: GridView.count(
        padding: const EdgeInsets.all(16),
        crossAxisCount: 2,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        children: [
          _buildCard(
            context,
            'Daily Collections',
            Icons.receipt_long,
            '/admin/reports/daily-collections',
            Colors.blue,
          ),
          _buildCard(
            context,
            'Loan Arrears',
            Icons.warning,
            '/admin/reports/loan-arrears',
            Colors.red,
          ),
          _buildCard(
            context,
            'Income Report',
            Icons.trending_up,
            '/admin/reports/income',
            Colors.green,
          ),
          _buildCard(
            context,
            'General Statement',
            Icons.account_balance_wallet,
            '/admin/reports/general-statement',
            Colors.purple,
          ),
          _buildCard(
            context,
            'Payment Lookup',
            Icons.search,
            '/admin/reports/payment-lookup',
            Colors.orange,
          ),
        ],
      ),
    );
  }

  Widget _buildCard(BuildContext context, String title, IconData icon, String route, Color color) {
    return InkWell(
      onTap: () => context.push(route),
      borderRadius: BorderRadius.circular(12),
      child: Card(
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircleAvatar(
              backgroundColor: color.withOpacity(0.2),
              radius: 30,
              child: Icon(icon, color: color, size: 30),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}
