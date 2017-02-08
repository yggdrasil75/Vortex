﻿using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Components.Extensions;
using Components.Scripting;
using System.Text;

namespace Components.ModInstaller
{
    public class ModFormatManager
    {

        #region Fields

        private string FomodRoot = "fomod";
        private string OmodRoot = "omod";
        #endregion

        #region Properties

        public IScriptTypeRegistry CurrentScriptTypeRegistry;

        #endregion

        #region Costructors

        public ModFormatManager()
        {
            // ??? Dummy path
        }

        #endregion

        public async Task<IList<string>> GetRequirements(IList<string> modFiles)
        {
            CurrentScriptTypeRegistry = await ScriptTypeRegistry.DiscoverScriptTypes(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location));
            IList<string> RequiredFiles = new List<string>();

            await Task.Run(() =>
            {
                foreach (IScriptType scriptType in CurrentScriptTypeRegistry.Types)
                {
                    bool HasFoundScriptType = false;
                    if (scriptType.FileNames != null)
                    {
                        foreach (string scriptFile in scriptType.FileNames)
                        {
                            // ??? Need to check for Fomod/Omod/Whatever before this part
                            string FileToFind = Path.Combine(FomodRoot, scriptFile);
                            string Match = modFiles.Where(x => Path.GetFileName(x).Contains(scriptFile, StringComparison.OrdinalIgnoreCase) && Path.GetFileName(Path.GetDirectoryName(x)).Contains(FomodRoot, StringComparison.OrdinalIgnoreCase)).FirstOrDefault();
                            if (!string.IsNullOrEmpty(Match))
                            {
                                HasFoundScriptType = true;
                                RequiredFiles.Add(Match);
                            }
                        }
                    }

                    if (HasFoundScriptType)
                        break;
                }
            });

            return RequiredFiles;
        }

        public async Task<IScriptType> GetScriptType(IList<string> modFiles)
        {
            CurrentScriptTypeRegistry = await ScriptTypeRegistry.DiscoverScriptTypes(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location));
            IScriptType FoundScriptType = null;

            await Task.Run(() =>
            {
                foreach (IScriptType scriptType in CurrentScriptTypeRegistry.Types)
                {
                    bool HasFoundScriptType = false;
                    if (scriptType.FileNames != null)
                    {
                        foreach (string scriptFile in scriptType.FileNames)
                        {
                            // ??? Need to check for Fomod/Omod/Whatever before this part
                            string FileToFind = Path.Combine(FomodRoot, scriptFile);
                            string Match = modFiles.Where(x => Path.GetFileName(x).Contains(scriptFile, StringComparison.OrdinalIgnoreCase) && Path.GetFileName(Path.GetDirectoryName(x)).Contains(FomodRoot, StringComparison.OrdinalIgnoreCase)).FirstOrDefault();
                            if (!string.IsNullOrEmpty(Match))
                            {
                                HasFoundScriptType = true;
                                FoundScriptType = scriptType;
                            }
                        }
                    }

                    if (HasFoundScriptType)
                        break;
                }
            });

            return FoundScriptType;
        }
    }
}
