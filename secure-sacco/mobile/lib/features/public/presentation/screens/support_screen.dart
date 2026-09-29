import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  String? _messageStatus;
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();

  void _handleContactSubmit() {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _messageStatus = 'Message sent successfully! We will respond within 24 hours.';
      });
      _formKey.currentState!.reset();
      _nameController.clear();
      _emailController.clear();
      _subjectController.clear();
      _messageController.clear();

      Future.delayed(const Duration(seconds: 5), () {
        if (mounted) {
          setState(() {
            _messageStatus = null;
          });
        }
      });
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

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
                      'Support Center',
                      style: theme.textTheme.headlineLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Colors.blueGrey[900],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      "We're here to help. Get in touch with our support team.",
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: Colors.blueGrey[600],
                      ),
                    ),
                    const SizedBox(height: 32),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        if (constraints.maxWidth > 600) {
                          return Row(
                            children: [
                              Expanded(child: _buildContactMethod(theme, Icons.mail, 'Email', 'support@sacco.local', 'Response time: 24 hours', Colors.teal)),
                              const SizedBox(width: 16),
                              Expanded(child: _buildContactMethod(theme, Icons.phone, 'Phone', '+254 (0) 123 456 789', 'Mon-Fri, 9 AM - 5 PM', Colors.blue)),
                              const SizedBox(width: 16),
                              Expanded(child: _buildContactMethod(theme, Icons.chat, 'Live Chat', 'Available 9 AM - 5 PM', 'Ask a question now', Colors.purple)),
                            ],
                          );
                        } else {
                          return Column(
                            children: [
                              _buildContactMethod(theme, Icons.mail, 'Email', 'support@sacco.local', 'Response time: 24 hours', Colors.teal),
                              const SizedBox(height: 16),
                              _buildContactMethod(theme, Icons.phone, 'Phone', '+254 (0) 123 456 789', 'Mon-Fri, 9 AM - 5 PM', Colors.blue),
                              const SizedBox(height: 16),
                              _buildContactMethod(theme, Icons.chat, 'Live Chat', 'Available 9 AM - 5 PM', 'Ask a question now', Colors.purple),
                            ],
                          );
                        }
                      },
                    ),
                    const SizedBox(height: 32),
                    const Divider(),
                    const SizedBox(height: 32),
                    Text(
                      'Send us a Message',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Colors.blueGrey[800],
                      ),
                    ),
                    const SizedBox(height: 24),
                    if (_messageStatus != null)
                      Container(
                        padding: const EdgeInsets.all(16),
                        margin: const EdgeInsets.only(bottom: 24),
                        decoration: BoxDecoration(
                          color: Colors.green[50],
                          border: Border.all(color: Colors.green[200]!),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _messageStatus!,
                          style: TextStyle(color: Colors.green[800]),
                        ),
                      ),
                    Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildInputField('Name', 'Your name', _nameController),
                          const SizedBox(height: 16),
                          _buildInputField('Email', 'your@email.com', _emailController, keyboardType: TextInputType.emailAddress),
                          const SizedBox(height: 16),
                          _buildInputField('Subject', 'How can we help?', _subjectController),
                          const SizedBox(height: 16),
                          _buildInputField('Message', 'Tell us more about your issue...', _messageController, maxLines: 5),
                          const SizedBox(height: 24),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _handleContactSubmit,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.teal,
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              child: const Text(
                                'Send Message',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    const Divider(),
                    const SizedBox(height: 32),
                    Text(
                      'Frequently Asked Questions',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Colors.blueGrey[800],
                      ),
                    ),
                    const SizedBox(height: 24),
                    _buildFaqItem(theme, 'How do I reset my password?', 'Click "Forgot Password?" on the login page and follow the instructions sent to your email.'),
                    _buildFaqItem(theme, 'What if I forgot my username?', 'Contact our support team with your registered email or phone number and we\'ll help you recover your account.'),
                    _buildFaqItem(theme, 'Is my account secure?', 'Yes, we use industry-leading encryption and security measures to protect your data. Never share your password with anyone.'),
                    _buildFaqItem(theme, 'How do I enable two-factor authentication?', 'Once logged in, go to Settings > Security Settings to enable two-factor authentication for added protection.'),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildContactMethod(ThemeData theme, IconData icon, String title, String detail, String subtitle, MaterialColor color) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: color[50],
        border: Border.all(color: color[200]!),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color[600]),
              const SizedBox(width: 12),
              Text(
                title,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.blueGrey[900],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            detail,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: Colors.blueGrey[800],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: Colors.blueGrey[500],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputField(String label, String hint, TextEditingController controller, {int maxLines = 1, TextInputType? keyboardType}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: Colors.blueGrey,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'This field is required';
            }
            return null;
          },
          decoration: InputDecoration(
            hintText: hint,
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.blueGrey[200]!),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.blueGrey[200]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Colors.teal),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFaqItem(ThemeData theme, String question, String answer) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(8),
        ),
        child: ExpansionTile(
          title: Text(
            question,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.blueGrey[900],
            ),
          ),
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 16.0, right: 16.0, bottom: 16.0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  answer,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: Colors.blueGrey[700],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
