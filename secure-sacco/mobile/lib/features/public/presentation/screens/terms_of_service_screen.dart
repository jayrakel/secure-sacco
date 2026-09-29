import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class TermsOfServiceScreen extends StatelessWidget {
  const TermsOfServiceScreen({super.key});

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
                      'Terms of Service',
                      style: theme.textTheme.headlineLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Colors.blueGrey[900],
                      ),
                    ),
                    const SizedBox(height: 32),
                    _buildSection(
                      theme,
                      '1. Agreement to Terms',
                      'By accessing and using the Secure SACCO System, you accept and agree to be bound by and comply with these Terms and Conditions. If you do not agree to abide by the above, please do not use this service.',
                    ),
                    _buildSection(
                      theme,
                      '2. Use License',
                      'Permission is granted to temporarily download one copy of the materials (information or software) on the Secure SACCO System for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:',
                    ),
                    _buildBulletList([
                      'Modify or copy the materials',
                      'Use the materials for any commercial purpose or for any public display',
                      'Attempt to decompile or reverse engineer any software contained on the system',
                      'Remove any copyright or other proprietary notations from the materials',
                      'Transfer the materials to another person or "mirror" the materials on any other server',
                    ]),
                    const SizedBox(height: 24),
                    _buildSection(
                      theme,
                      '3. Disclaimer',
                      'The materials on the Secure SACCO System are provided on an \'as is\' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.',
                    ),
                    _buildSection(
                      theme,
                      '4. Limitations',
                      'In no event shall the Secure SACCO System or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the Secure SACCO System.',
                    ),
                    _buildSection(
                      theme,
                      '5. Accuracy of Materials',
                      'The materials appearing on the Secure SACCO System could include technical, typographical, or photographic errors. We do not warrant that any of the materials on the Secure SACCO System are accurate, complete, or current. We may make changes to the materials contained on the Secure SACCO System at any time without notice.',
                    ),
                    _buildSection(
                      theme,
                      '6. Links',
                      'We have not reviewed all of the sites linked to our site and are not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by us of the site. Use of any such linked website is at the user\'s own risk.',
                    ),
                    _buildSection(
                      theme,
                      '7. Modifications',
                      'We may revise these Terms and Conditions for the Secure SACCO System at any time without notice. By using this system, you are agreeing to be bound by the then current version of these Terms and Conditions.',
                    ),
                    _buildSection(
                      theme,
                      '8. Governing Law',
                      'These Terms and Conditions are governed by and construed in accordance with the laws of the jurisdiction in which the SACCO operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.',
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
