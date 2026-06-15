import { FormEvent, useState } from "react";
import type { AscendancyOption, BuildProfile, Player } from "../types";

interface ProfileModalProps {
  player: Player;
  ascendancies: AscendancyOption[];
  onClose: () => void;
  onSave: (player: Player) => void;
}

export function ProfileModal({
  player,
  ascendancies,
  onClose,
  onSave,
}: ProfileModalProps) {
  const [builds, setBuilds] = useState<BuildProfile[]>(player.builds);
  const [activeBuildId, setActiveBuildId] = useState(player.activeBuildId);
  const selectedBuild =
    builds.find((build) => build.id === activeBuildId) ?? builds[0];
  const selectedAscendancy = ascendancies.find(
    (ascendancy) => ascendancy.id === selectedBuild?.ascendancyId,
  );

  function updateSelectedBuild(patch: Partial<BuildProfile>) {
    if (!selectedBuild) return;

    setBuilds((current) =>
      current.map((build) =>
        build.id === selectedBuild.id ? { ...build, ...patch } : build,
      ),
    );
  }

  function createBuild() {
    const nextBuild: BuildProfile = {
      id: crypto.randomUUID?.() ?? `build-${Date.now()}`,
      characterName: "",
      buildName: "New build",
      ascendancyId: selectedBuild?.ascendancyId ?? "spirit-walker",
    };

    setBuilds((current) => [...current, nextBuild]);
    setActiveBuildId(nextBuild.id);
  }

  function deleteSelectedBuild() {
    if (!selectedBuild || builds.length <= 1) return;

    const nextBuilds = builds.filter((build) => build.id !== selectedBuild.id);
    setBuilds(nextBuilds);
    setActiveBuildId(nextBuilds[0]?.id ?? "");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      ...player,
      activeBuildId,
      builds,
    });
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <form
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <header className="modal-header">
          <div>
            <p className="eyebrow">Local mock profile</p>
            <h2 id="profile-title">{player.accountName}</h2>
          </div>
          <button
            aria-label="Close profile"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </header>

        <div className="profile-account">
          <span>Account</span>
          <strong>{player.accountName}</strong>
          <small>Locked after invite claim</small>
        </div>

        <section className="build-editor" aria-label="Build profiles">
          <div className="build-tabs" role="tablist" aria-label="Builds">
            {builds.map((build) => (
              <button
                aria-selected={build.id === activeBuildId}
                className={build.id === activeBuildId ? "build-tab active" : "build-tab"}
                key={build.id}
                onClick={() => setActiveBuildId(build.id)}
                type="button"
              >
                {build.buildName || "Untitled build"}
              </button>
            ))}
            <button className="build-tab add-build" onClick={createBuild} type="button">
              + New build
            </button>
          </div>

          {selectedBuild ? (
            <>
              <div className="profile-form-grid">
                <label>
                  Character name
                  <input
                    value={selectedBuild.characterName}
                    onChange={(event) =>
                      updateSelectedBuild({ characterName: event.target.value })
                    }
                    placeholder="AkioMonke"
                  />
                </label>
                <label>
                  Build name
                  <input
                    value={selectedBuild.buildName}
                    onChange={(event) =>
                      updateSelectedBuild({ buildName: event.target.value })
                    }
                    placeholder="BIG MONKE"
                  />
                </label>
                <label className="wide-field">
                  Ascendancy
                  <select
                    value={selectedBuild.ascendancyId}
                    onChange={(event) =>
                      updateSelectedBuild({
                        ascendancyId: event.target.value as BuildProfile["ascendancyId"],
                      })
                    }
                  >
                    {ascendancies.map((ascendancy) => (
                      <option key={ascendancy.id} value={ascendancy.id}>
                        {ascendancy.name} / {ascendancy.characterClass}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="ascendancy-preview">
                  {selectedAscendancy ? (
                    <img src={selectedAscendancy.icon} alt="" loading="lazy" />
                  ) : null}
                  <span>
                    <strong>{selectedAscendancy?.name ?? "Unknown"}</strong>
                    <small>{selectedAscendancy?.characterClass ?? "No class"}</small>
                  </span>
                </div>
              </div>
              <div className="build-danger-zone">
                <div>
                  <span>Selected build</span>
                  <strong>{selectedBuild.buildName || "Untitled build"}</strong>
                </div>
                <button
                  className="danger-button"
                  disabled={builds.length <= 1}
                  onClick={deleteSelectedBuild}
                  type="button"
                >
                  Delete selected build
                </button>
              </div>
            </>
          ) : null}
        </section>

        <div className="modal-actions">
          <button className="ghost-button wide" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-action wide" type="submit">
            Save profile
          </button>
        </div>
      </form>
    </div>
  );
}
