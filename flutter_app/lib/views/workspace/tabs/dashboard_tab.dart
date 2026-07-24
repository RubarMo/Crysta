import 'package:flutter/material.dart';
import '../../../models.dart';
import '../../../db_service.dart';

class DashboardTab extends StatelessWidget {
  final Novel activeNovel;
  final List<Character> characters;
  final List<Scene> scenes;
  final String Function(String) t;
  final String language;
  final bool isMobile;
  final ValueChanged<Novel> onNovelUpdated;

  const DashboardTab({
    super.key,
    required this.activeNovel,
    required this.characters,
    required this.scenes,
    required this.t,
    required this.language,
    required this.isMobile,
    required this.onNovelUpdated,
  });

  @override
  Widget build(BuildContext context) {
    final targetWords = activeNovel.targetWordCount > 0 ? activeNovel.targetWordCount : 50000;
    final currentWords = activeNovel.currentWordCount;
    final progress = (currentWords / targetWords).clamp(0.0, 1.0);

    return SingleChildScrollView(
      padding: EdgeInsets.all(isMobile ? 12 : 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t('novelDashboardTitle'),
            style: (isMobile ? Theme.of(context).textTheme.titleLarge : Theme.of(context).textTheme.headlineSmall)
                ?.copyWith(fontWeight: FontWeight.bold),
          ),
          Text(t('novelDashboardDesc'), style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 16),
          Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: EdgeInsets.all(isMobile ? 12 : 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  isMobile
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(t('writingProgress'), style: const TextStyle(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text(
                              '$currentWords / $targetWords ${t('words')} (${(progress * 100).toStringAsFixed(1)}%)',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(t('writingProgress'), style: const TextStyle(fontWeight: FontWeight.bold)),
                            Text(
                              '$currentWords / $targetWords ${t('words')} (${(progress * 100).toStringAsFixed(1)}%)',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                          ],
                        ),
                  const SizedBox(height: 12),
                  LinearProgressIndicator(
                    value: progress,
                    minHeight: 10,
                    color: Theme.of(context).colorScheme.primary,
                    backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(5),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          isMobile
              ? Column(
                  children: [
                    _buildStatCard(context, t('statsCharactersCount'), '${characters.length}', Icons.people, Theme.of(context).colorScheme.secondary),
                    const SizedBox(height: 8),
                    _buildStatCard(context, t('statsScenesPlanned'), '${scenes.length}', Icons.table_chart, Theme.of(context).colorScheme.tertiary),
                    const SizedBox(height: 8),
                    _buildStatCard(context, t('statsScenesDone'), '${scenes.where((s) => s.actualWordCount > 0).length}', Icons.check_circle, Colors.teal),
                  ],
                )
              : Row(
                  children: [
                    Expanded(child: _buildStatCard(context, t('statsCharactersCount'), '${characters.length}', Icons.people, Theme.of(context).colorScheme.secondary)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildStatCard(context, t('statsScenesPlanned'), '${scenes.length}', Icons.table_chart, Theme.of(context).colorScheme.tertiary)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildStatCard(context, t('statsScenesDone'), '${scenes.where((s) => s.actualWordCount > 0).length}', Icons.check_circle, Colors.teal)),
                  ],
                ),
          const SizedBox(height: 16),
          Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: EdgeInsets.all(isMobile ? 12 : 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(t('novelInfoTitle'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  TextFormField(
                    initialValue: activeNovel.title,
                    decoration: InputDecoration(labelText: t('novelTitleLabel'), border: const OutlineInputBorder()),
                    onChanged: (val) {
                      final updated = Novel(
                        id: activeNovel.id,
                        title: val,
                        genre: activeNovel.genre,
                        targetAudience: activeNovel.targetAudience,
                        targetWordCount: activeNovel.targetWordCount,
                        currentWordCount: activeNovel.currentWordCount,
                        createdAt: activeNovel.createdAt,
                      );
                      onNovelUpdated(updated);
                      DatabaseService.updateNovel(
                        id: updated.id!,
                        title: updated.title,
                        genre: updated.genre,
                        targetAudience: updated.targetAudience,
                        targetWordCount: updated.targetWordCount,
                      );
                    },
                  ),
                  const SizedBox(height: 16),
                  isMobile
                      ? Column(
                          children: [
                            TextFormField(
                              initialValue: activeNovel.genre,
                              decoration: InputDecoration(labelText: t('novelGenreLabel'), border: const OutlineInputBorder()),
                              onChanged: (val) {
                                final updated = Novel(
                                  id: activeNovel.id,
                                  title: activeNovel.title,
                                  genre: val,
                                  targetAudience: activeNovel.targetAudience,
                                  targetWordCount: activeNovel.targetWordCount,
                                  currentWordCount: activeNovel.currentWordCount,
                                  createdAt: activeNovel.createdAt,
                                );
                                onNovelUpdated(updated);
                                DatabaseService.updateNovel(
                                  id: updated.id!,
                                  title: updated.title,
                                  genre: updated.genre,
                                  targetAudience: updated.targetAudience,
                                  targetWordCount: updated.targetWordCount,
                                );
                              },
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              initialValue: activeNovel.targetAudience,
                              decoration: InputDecoration(labelText: t('novelAudienceLabel'), border: const OutlineInputBorder()),
                              onChanged: (val) {
                                final updated = Novel(
                                  id: activeNovel.id,
                                  title: activeNovel.title,
                                  genre: activeNovel.genre,
                                  targetAudience: val,
                                  targetWordCount: activeNovel.targetWordCount,
                                  currentWordCount: activeNovel.currentWordCount,
                                  createdAt: activeNovel.createdAt,
                                );
                                onNovelUpdated(updated);
                                DatabaseService.updateNovel(
                                  id: updated.id!,
                                  title: updated.title,
                                  genre: updated.genre,
                                  targetAudience: updated.targetAudience,
                                  targetWordCount: updated.targetWordCount,
                                );
                              },
                            ),
                          ],
                        )
                      : Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                initialValue: activeNovel.genre,
                                decoration: InputDecoration(labelText: t('novelGenreLabel'), border: const OutlineInputBorder()),
                                onChanged: (val) {
                                  final updated = Novel(
                                    id: activeNovel.id,
                                    title: activeNovel.title,
                                    genre: val,
                                    targetAudience: activeNovel.targetAudience,
                                    targetWordCount: activeNovel.targetWordCount,
                                    currentWordCount: activeNovel.currentWordCount,
                                    createdAt: activeNovel.createdAt,
                                  );
                                  onNovelUpdated(updated);
                                  DatabaseService.updateNovel(
                                    id: updated.id!,
                                    title: updated.title,
                                    genre: updated.genre,
                                    targetAudience: updated.targetAudience,
                                    targetWordCount: updated.targetWordCount,
                                  );
                                },
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: TextFormField(
                                initialValue: activeNovel.targetAudience,
                                decoration: InputDecoration(labelText: t('novelAudienceLabel'), border: const OutlineInputBorder()),
                                onChanged: (val) {
                                  final updated = Novel(
                                    id: activeNovel.id,
                                    title: activeNovel.title,
                                    genre: activeNovel.genre,
                                    targetAudience: val,
                                    targetWordCount: activeNovel.targetWordCount,
                                    currentWordCount: activeNovel.currentWordCount,
                                    createdAt: activeNovel.createdAt,
                                  );
                                  onNovelUpdated(updated);
                                  DatabaseService.updateNovel(
                                    id: updated.id!,
                                    title: updated.title,
                                    genre: updated.genre,
                                    targetAudience: updated.targetAudience,
                                    targetWordCount: updated.targetWordCount,
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                  const SizedBox(height: 16),
                  TextFormField(
                    initialValue: '${activeNovel.targetWordCount}',
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(labelText: t('novelTargetWordsLabel'), border: const OutlineInputBorder()),
                    onChanged: (val) {
                      final updated = Novel(
                        id: activeNovel.id,
                        title: activeNovel.title,
                        genre: activeNovel.genre,
                        targetAudience: activeNovel.targetAudience,
                        targetWordCount: int.tryParse(val) ?? 0,
                        currentWordCount: activeNovel.currentWordCount,
                        createdAt: activeNovel.createdAt,
                      );
                      onNovelUpdated(updated);
                      DatabaseService.updateNovel(
                        id: updated.id!,
                        title: updated.title,
                        genre: updated.genre,
                        targetAudience: updated.targetAudience,
                        targetWordCount: updated.targetWordCount,
                      );
                    },
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton.icon(
                    onPressed: () async {
                      await DatabaseService.updateNovel(
                        id: activeNovel.id!,
                        title: activeNovel.title,
                        genre: activeNovel.genre,
                        targetAudience: activeNovel.targetAudience,
                        targetWordCount: activeNovel.targetWordCount,
                      );
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(language == 'ar' ? 'تم الحفظ بنجاح!' : 'Saved successfully!'),
                          backgroundColor: Theme.of(context).colorScheme.primary,
                        ),
                      );
                    },
                    icon: const Icon(Icons.save),
                    label: Text(t('save')),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(BuildContext context, String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withValues(alpha: 0.15),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant), overflow: TextOverflow.ellipsis),
                  Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
