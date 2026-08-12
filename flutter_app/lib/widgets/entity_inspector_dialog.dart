import 'package:flutter/material.dart';
import '../locales.dart';
import '../models.dart';

class EntityInspectorDialog extends StatelessWidget {
  final Character character;
  final String language;
  final VoidCallback? onOpenFullProfile;

  const EntityInspectorDialog({
    super.key,
    required this.character,
    required this.language,
    this.onOpenFullProfile,
  });

  String _t(String key) => Locales.t(key, language);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final tagColor = colorScheme.primary;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 8,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480, maxHeight: 600),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: tagColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: tagColor.withValues(alpha: 0.3)),
                    ),
                    child: Icon(Icons.person, color: tagColor, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          character.name,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: tagColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            _t('categoryCharacters'),
                            style: TextStyle(
                              color: tagColor,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                    tooltip: _t('close'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(height: 1),
              const SizedBox(height: 14),

              // Scrollable Body
              Flexible(
                child: SingleChildScrollView(
                  child: _buildCharacterDetails(theme, colorScheme),
                ),
              ),

              const SizedBox(height: 16),
              // Action Buttons
              Wrap(
                alignment: WrapAlignment.end,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 8,
                runSpacing: 6,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text(_t('close')),
                  ),
                  if (onOpenFullProfile != null)
                    FilledButton.icon(
                      onPressed: () {
                        Navigator.of(context).pop();
                        onOpenFullProfile!();
                      },
                      icon: const Icon(Icons.open_in_new, size: 16),
                      label: Text(_t('jumpToBioBtn')),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCharacterDetails(ThemeData theme, ColorScheme colorScheme) {
    final c = character;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (c.motivation.isNotEmpty)
          _buildInfoTile(
            title: _t('charMotivation'),
            content: c.motivation,
            icon: Icons.lightbulb_outline,
            color: colorScheme.primary,
          ),
        if (c.goal.isNotEmpty)
          _buildInfoTile(
            title: _t('charGoal'),
            content: c.goal,
            icon: Icons.flag_outlined,
            color: Colors.amber,
          ),
        if (c.conflict.isNotEmpty)
          _buildInfoTile(
            title: _t('charConflict'),
            content: c.conflict,
            icon: Icons.flash_on_outlined,
            color: Colors.deepOrange,
          ),
        if (c.epiphany.isNotEmpty)
          _buildInfoTile(
            title: _t('charEpiphany'),
            content: c.epiphany,
            icon: Icons.wb_incandescent_outlined,
            color: Colors.teal,
          ),
        if (c.oneParagraphSummary.isNotEmpty)
          _buildInfoTile(
            title: _t('step3SummaryLabel'),
            content: c.oneParagraphSummary,
            icon: Icons.description_outlined,
            color: colorScheme.secondary,
          ),
      ],
    );
  }

  Widget _buildInfoTile({
    required String title,
    required String content,
    required IconData icon,
    required Color color,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.15)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 16, color: color),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              content,
              style: const TextStyle(fontSize: 13, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }
}
