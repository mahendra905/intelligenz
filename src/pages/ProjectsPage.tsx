import React, { useState, useMemo } from 'react';
import { Project } from '../types';
import { Code2, Github, ExternalLink, Sparkles, Users, Terminal } from 'lucide-react';

interface ProjectsPageProps {
  projects: Project[];
  onSelectProject?: (project: Project) => void;
  onNavigate: (path: string) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ projects, onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = [
    'All',
    'AI',
    'Machine Learning',
    'Computer Vision',
    'NLP & LLMs',
    'Generative AI',
    'Robotics',
    'Web Development',
  ];

  const filteredProjects = useMemo(() => {
    if (!Array.isArray(projects)) return [];
    if (selectedCategory === 'All') return projects;
    return projects.filter(
      (p) =>
        p.category === selectedCategory ||
        (Array.isArray(p.tech_stack) && p.tech_stack.includes(selectedCategory)) ||
        (Array.isArray(p.technologies) && p.technologies.includes(selectedCategory))
    );
  }, [projects, selectedCategory]);

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 border border-[#00E5FF]/20 bg-[#00E5FF]/5 rounded-full py-1.5 px-4 text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-[#00E5FF] font-bold">
          <Code2 className="w-3.5 h-3.5" />
          <span>Student R&amp;D &amp; Open Source Labs</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-['Outfit'] tracking-tight">
          AI Systems &amp; Software Projects
        </h1>

        <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
          Explore student-built neural networks, vision pipelines, NLP copilots, and robotic architectures developed by students of the{' '}
          <span className="text-white font-semibold">Department of CSE (AIML) &amp; AI</span> at{' '}
          <span className="text-white font-semibold">DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY</span>.
        </p>
      </div>

      {/* Categories Toolbar */}
      <div className="p-3 rounded-2xl bg-[#0D1017] border border-[#1A1C23] flex items-center justify-center gap-2 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-[#00E5FF] text-[#0A0B0E] font-bold shadow-md shadow-[#00E5FF]/20'
                : 'text-[#9CA3AF] hover:text-white hover:bg-[#121622]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filteredProjects.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-[#0D1017] border border-[#1A1C23] p-8 space-y-3">
          <p className="text-sm font-semibold text-white">No projects found in this domain.</p>
          <button
            onClick={() => setSelectedCategory('All')}
            className="px-4 py-2 rounded-xl bg-[#1A1C23] hover:bg-[#252833] text-[#00E5FF] text-xs font-bold transition-colors"
          >
            Show All Projects
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const techList = Array.isArray(project.technologies)
              ? project.technologies
              : Array.isArray(project.tech_stack)
              ? project.tech_stack
              : typeof project.tech_stack === 'string'
              ? (project.tech_stack as string).split(',').map((s) => s.trim()).filter(Boolean)
              : [];
            return (
              <div
                key={project.id}
                className="group rounded-2xl bg-[#0D1017] border border-[#1A1C23] hover:border-[#00E5FF]/40 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#00E5FF]/5 flex flex-col justify-between"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0A0B0E]">
                  <img
                    src={project.image_url || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80'}
                    alt={project.name || project.title || 'Project'}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D1017] via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-[#0A0B0E]/90 text-[#00E5FF] border border-[#00E5FF]/30 uppercase tracking-wider">
                    {project.category || 'AI Project'}
                  </span>
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-[#0A0B0E]/90 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    {project.status || 'Active'}
                  </span>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between text-left">
                  <div>
                    <h3 className="text-lg font-bold text-white font-['Outfit'] group-hover:text-[#00E5FF] transition-colors leading-snug">
                      {project.name || project.title || 'Untitled Project'}
                    </h3>
                    <p className="text-xs text-[#9CA3AF] mt-2.5 line-clamp-3 leading-relaxed">
                      {project.description || project.short_description || 'Student technical research project.'}
                    </p>

                    {/* Tech Stack */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {techList.map((tech, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0A0B0E] text-[#6B7280] border border-[#1A1C23]"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* Team Members */}
                    {project.team_members && project.team_members.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#1A1C23] flex items-center gap-2 text-xs text-[#6B7280]">
                        <Users className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />
                        <span className="truncate">{project.team_members.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Links */}
                  <div className="mt-6 pt-4 border-t border-[#1A1C23] flex items-center gap-3">
                    {project.github_url && (
                      <a
                        href={project.github_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 px-3 rounded-lg bg-[#0A0B0E] hover:bg-[#121622] text-xs font-semibold text-[#D1D5DB] hover:text-white border border-[#1A1C23] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Github className="w-3.5 h-3.5 text-[#00E5FF]" />
                        <span>Source</span>
                      </a>
                    )}
                    {project.demo_url && (
                      <a
                        href={project.demo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 px-3 rounded-lg bg-[#00E5FF] hover:bg-[#33ebff] text-xs font-bold text-[#0A0B0E] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#00E5FF]/20"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Live Demo</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
