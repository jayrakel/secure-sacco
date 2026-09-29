import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.grey[50],
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.teal),
          onPressed: () => context.go('/login'),
        ),
        title: Text(
          'Back to Login',
          style: theme.textTheme.titleMedium?.copyWith(
            color: Colors.teal,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 800),
            child: Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Privacy Policy',
                      style: theme.textTheme.headlineLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Colors.blueGrey[900],
                      ),
                    ),
                    const SizedBox(height: 32),
                    _buildSection(
                      theme,
                      '1. Introduction',
                      'We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our Secure SACCO System.',
                    ),
                    _buildSection(
                      theme,
                      '2. Information We Collect',
                      'We may collect information about you in a variety of ways. The information we may collect on the site includes:',
                    ),
                    _buildBulletList([
                      'Personal identification information (name, email address, phone number, etc.)',
                      'Financial information (account balances, transaction history)',
                      'Device information (IP address, browser type, operating system)',
                      'Usage data and analytics',
                    ]),
                    const SizedBox(height: 24),
                    _buildSection(
                      theme,
                      '3. Use of Your Information',
                      'Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the site to:',
                    ),
                    _buildBulletList([
                      'Process transactions and send related information',
                      'Email regarding your account or order',
                      'Fulfill and manage purchases, orders, or payments',
                      'Generate a personal profile about you to make future visits to the site easier',
                      'Increase the efficiency and operation of the site',
                      'Monitor and analyze usage and trends to improve your experience',
                    ]),
                    const SizedBox(height: 24),
                    _buildSection(
                      theme,
                      '4. Disclosure of Your Information',
                      'We may share your information in the following situations:',
                    ),
                    _buildBulletList([
                      'By Law or to Protect Rights',
                      'Third-Party Service Providers',
                      'Affiliates and Partners',
                      'Business Transfers',
                    ]),
                    const SizedBox(height: 24),
                    _buildSection(
                      theme,
                      '5. Security of Your Information',
                      'We use administrative, technical, and physical security measures to protect your personal information. However, perfect security does not exist on the Internet.',
                    ),
                    _buildSection(
                      theme,
                      '6. Contact Us',
                      'If you have questions or comments about this Privacy Policy, please contact us at:\n\nsupport@sacco.local',
                    ),
                    const SizedBox(height: 32),
                    Text(
                      'Last updated: ${DateTime.now().toLocal().toString().split(' ')[0]}',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSection(ThemeData theme, String title, String content) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
            color: Colors.blueGrey[800],
          ),
        ),
        const SizedBox(height: 12),
        Text(
          content,
          style: theme.textTheme.bodyLarge?.copyWith(
            color: Colors.blueGrey[700],
            height: 1.5,
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildBulletList(List<String> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: items.map((item) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 8.0, left: 16.0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('• ', style: TextStyle(fontSize: 16)),
              Expanded(
                child: Text(
                  item,
                  style: TextStyle(
                    color: Colors.blueGrey[700],
                    height: 1.5,
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
